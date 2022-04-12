#! /usr/bin/env node
import * as fs from 'fs';
import commandLineArgs from 'command-line-args';
import GitHub from 'github-api';

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

function getResultBadge( resultType ) {
	switch ( resultType ) {
		case 'Skipped':
			return ':next_track_button:';
		case 'Success':
			return ':white_check_mark:';
		case 'PartialSuccess':
			return ':warning:';
		case 'Failed':
			return ':x:';
		case 'Aborted':
			return ':stop_sign:';
		default:
			return '';
	}
}

function getResultLabel( resultType ) {
	switch ( resultType ) {
		case 'Skipped':
			return 'SKIPPED';
		case 'Success':
			return 'PASSED';
		case 'PartialSuccess':
			return 'PARTIAL SUCCESS';
		case 'Failed':
			return 'FAILURE';
		case 'Aborted':
			return 'ABORTED';
		default:
			return '';
	}
}

function getResultEmojis( resultType, numTests ) {
	let emoji = '';
	switch ( resultType ) {
		case 'Success':
			emoji = '🟩';
			break;
		case 'PartialSuccess':
			emoji = '🟨';
			break;
		case 'Failed':
		case 'Aborted':
			emoji = '🟥';
			break;
	}

	let result = '';
	for ( let i = 0; i < numTests; i++ ) {
		result += emoji;
	}

	return result;
}

function formatIssueType( issueType ) {
	switch ( issueType ) {
		case 'Blocker':
			return ':stop_sign: &nbsp;&nbsp; Blocker';
		case 'Error':
			return ':x: &nbsp;&nbsp; Error';
		case 'Warning':
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
	let initialMessage = `We have tested the application using the commit \`${ options.commit }\` and `;
	if ( summary.results.Failed || summary.results.aborted ) {
		// Failed
		stamp = 'https://cldup.com/GQ-AjSRSzb.png';
		initialMessage = ' __issues were found__ that prevent the application from working. You can review the issues below.';
	} else if ( summary.results.PartialSuccess ) {
		// Partial Success
		stamp = 'https://cldup.com/bL0eXSSJyF.png';
		initialMessage = 'no significant issues were found. There were, however, __some partial successes__, that you can review' +
			' in the full report below.';
	} else if ( summary.results.Success ) {
		// Success
		stamp = 'https://cldup.com/WhvxXikKLB.png';
		initialMessage = '__no issues were found__.';
	}

	// Convert json to markup/html
	let prettyResult = `<img align="right" width="200" src="${ stamp }">\n\n${ initialMessage }\n\n`;
	prettyResult += '__Expand each test suite to view detailed results__ _(failures/blockers are expanded by default)_.\n\n';

	prettyResult += '#### TESTS SUMMARY\n';

	prettyResult += `:white_check_mark: &nbsp;&nbsp; ${ getResultEmojis( 'Success', summary.results.Success ) }  **PASSED** - ${ summary.results.Success ?? 0 } tests \n`;

	prettyResult += `:warning: &nbsp;&nbsp; ${ getResultEmojis( 'PartialSuccess', summary.results.PartialSuccess ) }  **PARTIAL SUCCESS** - ${ summary.results.PartialSuccess ?? 0 } tests  \n`;

	prettyResult += `:x: &nbsp;&nbsp; ${ getResultEmojis( 'Failed', summary.results.Failed ) }  **FAILURE** - ${ summary.results.Failed ?? 0 } tests  \n`;

	if ( summary.results.Aborted ) {
		prettyResult += `:stop_sign: &nbsp;&nbsp; ${ getResultEmojis( 'Aborted', summary.results.Aborted ) }  **ABORTED** - ${ summary.results.Aborted } tests  \n`;
	}

	prettyResult += '\n\n<br/>\n\n## Test suite details\n<br/>\n';

	let counter = 1;
	for ( const test of results.results ) {
		prettyResult += `\n${ counter++ }. __${ test.name }__\n`;
		prettyResult += `_${ test.description }_\n\n`;

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

		prettyResult += '\n#   \n<br/>\n';
	}

	prettyResult += '<br/>\n';

	// Add feedback link
	if ( options[ 'pull-request' ] ) {
		const pullRequestURL = `https://github.com/${ repoOwner }/${ repoName }/pull/${ options[ 'pull-request' ] }`;
		const feedbackLink = 'https://docs.google.com/forms/d/e/1FAIpQLSeBRLrqiLp9giLr9BISifxd2L3xg1e7D0Vp3uJ2zzqOQwLw1w/' +
			`viewform?usp=pp_url&entry.1524908984=${ pullRequestURL }`;

		prettyResult += "  :arrow_right:  __This tool is under active development and it's not final__. If you have any feedback, " +
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

main().then( () => console.log( 'done' ) ).catch( err => console.error( err ) );
