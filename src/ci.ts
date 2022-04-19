#! /usr/bin/env node
import * as fs from 'fs';
import commandLineArgs from 'command-line-args';
import GitHub from 'github-api';
import { IssueType } from './lib/issue';
import { TestResultType } from './lib/results/testresult';

/**
 * Script that receives a Harmonia result JSON file, and creates the respective PRs comments
 */

const optionDefinitions = [
	{ name: 'failed', type: Boolean, defaultValue: false },
	{ name: 'start', type: Boolean, defaultValue: false },
	{ name: 'file', alias: 'f', type: String },
	{ name: 'branch', alias: 'b', type: String },
	{ name: 'repo', alias: 'r', type: String },
	{ name: 'github-user', alias: 'u', type: String },
	{ name: 'github-token', alias: 't', type: String },
	{ name: 'commit', type: String },
	{ name: 'pull-request', type: Number },
];

const options = commandLineArgs( optionDefinitions );

// Prepare GitHub connection
const GITHUB_USER = options[ 'github-user' ] || process.env.GITHUB_USER;
const GITHUB_TOKEN = options[ 'github-token' ] || process.env.GITHUB_TOKEN;

const github = new GitHub( {
	username: GITHUB_USER,
	token: GITHUB_TOKEN,
} );

// Break repo owner and repo name
const [ repoOwner, repoName ] = options.repo.split( '/' );
const repository = github.getRepo( repoOwner, repoName );

// Read the file
let results;
if ( options.file ) {
	const filepath = options.file;
	try {
		const jsonfile = fs.readFileSync( filepath, 'utf-8' );
		results = JSON.parse( jsonfile );
	} catch ( error ) {
		console.error( `Error opening file ${ filepath }: ${ ( error as Error ).message }` );
		process.exit( 1 );
	}
}

function updateBuildStatus( commitSHA, state, description ) {
	return repository.updateStatus( commitSHA, {
		state,
		description,
		context: 'Harmonia',
	} );
}

function getResultBadge( resultType: string|TestResultType ) {
	switch ( TestResultType[ resultType ] ) {
		case TestResultType.Skipped:
			return ':next_track_button:';
		case TestResultType.Success:
			return ':white_check_mark:';
		case TestResultType.PartialSuccess:
			return ':warning:';
		case TestResultType.Failed:
			return ':x:';
		case TestResultType.Aborted:
			return ':stop_sign:';
		default:
			return '';
	}
}

function getResultLabel( resultType: string|TestResultType ) {
	switch ( TestResultType[ resultType ] ) {
		case TestResultType.Skipped:
			return 'SKIPPED';
		case TestResultType.Success:
			return 'PASSED';
		case TestResultType.PartialSuccess:
			return 'PARTIAL SUCCESS';
		case TestResultType.Failed:
			return 'FAILED';
		case TestResultType.Aborted:
			return 'ABORTED';
		default:
			return '';
	}
}

function getResultEmojis( resultType: TestResultType, numTests: number ) {
	let emoji = '';
	switch ( resultType ) {
		case TestResultType.Success:
			emoji = '🟩';
			break;
		case TestResultType.PartialSuccess:
			emoji = '🟨';
			break;
		case TestResultType.Failed:
		case TestResultType.Aborted:
			emoji = '🟥';
			break;
	}

	return emoji.repeat( numTests );
}

function formatIssueType( issueType: IssueType ) {
	switch ( +IssueType[ issueType ] ) {
		case IssueType.Blocker:
			return ':stop_sign: &nbsp;&nbsp; Blocker';
		case IssueType.Error:
			return ':x: &nbsp;&nbsp; Error';
		case IssueType.Warning:
			return ':warning: &nbsp;&nbsp; Warning';
	}
}

function createMarkdown() {
	/**
	 * Given a Test object, generate the respective markdown
	 * @param test
	 */
	function formatTest( test: any ) {
		let result = '';

		if ( test.result === 'Skipped' ) {
			return '';
		}

		// If the test is a test suite
		if ( test.tests && test.tests.length > 0 ) {
			for ( const subtest of test.tests ) {
				result += formatTest( subtest );
			}
			return result;
		}

		result += `${ getResultBadge( test.result ) } | ${ test.name } | ${ test.description } | ${ test.issues?.length } \n`;
		return result;
	}

	/**
	 * Given an Issue object, generate the respective markdown
	 * @param test
	 */
	function formatIssues( test ) {
		let result = '';

		// If the test is a test suite
		if ( test.tests && test.tests.length > 0 ) {
			for ( const subtest of test.tests ) {
				result += formatIssues( subtest );
			}
			return result;
		}

		for ( const issue of test.issues ) {
			// Ignore notices
			if ( issue.type === 'Notice' ) {
				continue;
			}
			result += `* __${ formatIssueType( issue.type ) }__ - ${ issue.message }\n`;
			result += `    _In \`${ test.name }\`_\n`;
			if ( issue.documentation ) {
				result += `    [Read more in the documentation](${ issue.documentation })\n`;
			}
			result += '\n';
		}

		return result;
	}

	// Add result summary
	const summary = results.summary;

	let stamp;
	if ( summary.results.Failed || summary.results.Aborted ) {
		// Failed
		stamp = 'https://cldup.com/GQ-AjSRSzb.png';
	} else if ( summary.results.PartialSuccess ) {
		// Partial Success
		stamp = 'https://cldup.com/bL0eXSSJyF.png';
	} else if ( summary.results.Success ) {
		// Success
		stamp = 'https://cldup.com/WhvxXikKLB.png';
	}

	let prettyResult: string;

	// Convert json to markup/html
	prettyResult = `<img align="right" width="200" src="${ stamp }">\n\n`;

	prettyResult += `## Test summary for commit \`${ options.commit.substring( 0, 7 ) }\`\n\n`;

	if ( summary.results.Success ) {
		prettyResult += ':white_check_mark: &nbsp;&nbsp;';
		prettyResult += getResultEmojis( TestResultType.Success, summary.results.Success );
		prettyResult += ` ${ summary.results.Success } tests\n`;
	}

	if ( summary.results.PartialSuccess ) {
		prettyResult += ':warning: &nbsp;&nbsp;';
		prettyResult += getResultEmojis( TestResultType.PartialSuccess, summary.results.PartialSuccess );
		prettyResult += ` ${ summary.results.PartialSuccess } tests\n`;
	}

	if ( summary.results.Failed ) {
		prettyResult += ':x: &nbsp;&nbsp;';
		prettyResult += getResultEmojis( TestResultType.Failed, summary.results.Failed );
		prettyResult += ` ${ summary.results.Failed } tests\n`;
	}

	if ( summary.results.Aborted ) {
		prettyResult += ':stop_sign: &nbsp;&nbsp;';
		prettyResult += getResultEmojis( TestResultType.Aborted, summary.results.Aborted );
		prettyResult += ` ${ summary.results.Aborted } tests\n`;
	}

	prettyResult += '\n## Test suites\n\n';

	for ( const test of results.results ) {
		prettyResult += `\n### ${ test.name }\n\n`;
		prettyResult += `${ test.description }\n\n`;

		const open = test.result !== 'Success' ? 'open' : '';
		prettyResult += `<details ${ open }><summary>${ getResultBadge( test.result ) } &nbsp;&nbsp; ${ getResultLabel( test.result ) }. ` +
			'<em>Click to toggle details view - </em>&nbsp;:arrow_down:</summary>\n\n\n\n';

		prettyResult += '|  | Test | Description | Issues \n' +
			':--- | :--- | :--- | :--: \n';

		// Create the test summary entry
		prettyResult += formatTest( test );

		// Print out the issues
		const issuesPretty = formatIssues( test );
		prettyResult += '\n__Issues Found:__\n';
		if ( issuesPretty ) {
			prettyResult += '\n' + formatIssues( test );
		} else {
			prettyResult += '_None_\n\n';
		}

		prettyResult += '</details>\n';

		prettyResult += '\n#   \n\n';
	}

	prettyResult += '<br/>\n';

	// Add feedback link
	if ( options[ 'pull-request' ] ) {
		const pullRequestURL = `https://github.com/${ repoOwner }/${ repoName }/pull/${ options[ 'pull-request' ] }`;
		const feedbackLink = 'https://docs.google.com/forms/d/e/1FAIpQLSeBRLrqiLp9giLr9BISifxd2L3xg1e7D0Vp3uJ2zzqOQwLw1w/' +
			`viewform?usp=pp_url&entry.1524908984=${ pullRequestURL }`;

		prettyResult += '\n  :arrow_right:  __This tool is under active development__. If you have any feedback, ' +
			`you are invited to [fill this very short form](${ feedbackLink }).`;
	}

	return prettyResult;
}

/**
 * START OF THE MAIN BLOCK
 */
async function main() {
	if ( options.start ) {
		await updateBuildStatus( options.commit, 'pending', 'Preparing to run Harmonia tests' );
		return;
	}

	if ( options.failed || ! options.file ) {
		await updateBuildStatus( options.commit, 'failure', 'Unable to build application' );
		return;
	}

	// Update the commit build status
	const summary = results.summary.results;

	if ( summary.Aborted && summary.Aborted > 1 ) {
		// State: failure, message: aborted
		await updateBuildStatus( options.commit, 'failure', 'Harmonia didn\'t finish running all the tests' );
	} else if ( summary.Failed && summary.Failed > 1 ) {
		// State: error, message: X errors found
		await updateBuildStatus( options.commit, 'failure', `${ summary.Failed } tests failed` );
	} else if ( summary.PartialSuccess && summary.PartialSuccess > 1 ) {
		// State: success, message: Partial success
		await updateBuildStatus( options.commit, 'success', 'Passed, but there are warnings.' );
	} else {
		// State: success, message: success
		await updateBuildStatus( options.commit, 'success', 'Application passes all tests.' );
	}

	//  Create the Pull Request comment
	const pullRequestID = options[ 'pull-request' ] ?? false;
	if ( pullRequestID ) {
		const issues = github.getIssues( repoOwner, repoName );
		await issues.createIssueComment( pullRequestID, createMarkdown() );
		return;
	}
}

// main().then( () => console.log( 'done' ) ).catch( err => console.error( err ) );
console.log( createMarkdown() );
