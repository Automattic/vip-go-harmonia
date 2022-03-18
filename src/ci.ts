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
			return ':heavy_check_mark:';
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
			return 'FAILED';
		case 'Aborted':
			return 'ABORTED';
		default:
			return '';
	}
}

function formatIssueType( issueType ) {
	switch ( issueType ) {
		case 'Blocker':
			return ':stop_sign: Blocker';
		case 'Error':
			return ':x: Error';
		case 'Warning':
			return ':warning: Warning';
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
			result += `__${ formatIssueType( issue.type ) }__ - ${ issue.message }\n`;
			result += `    _In \`${ test.name }\`_\n`;
			if ( issue.documentation ) {
				result += `    [Read more in the documentation](${ issue.documentation })\n`;
			}
			result += '\n';
		}

		return result;
	}

	// Convert json to markup/html
	let prettyResult = '## Harmonia Results\n' +
		'This is an example of a small paragraph that we can include in the pull request comment to give further information about ' +
		'Harmonia, the tests and the results.\n\n';

	// Add result summary
	const summary = results.summary;

	if ( summary.results.Success ) {
		prettyResult += ` * :heavy_check_mark: **PASSED** :heavy_check_mark: - ${ summary.results.Success } tests  \n`;
	}

	if ( summary.results.PartialSuccess ) {
		prettyResult += ` * :warning: **PARTIAL SUCCESS** :warning: - ${ summary.results.PartialSuccess } tests  \n`;
	}

	if ( summary.results.Failed ) {
		prettyResult += ` * :x: **FAILED** :x: - ${ summary.results.Failed } tests  \n`;
	}

	if ( summary.results.Aborted ) {
		prettyResult += ` * :stop_sign: **ABORTED** :stop_sign: - ${ summary.results.Aborted } tests  \n`;
	}

	// TODO: quick summary of the results interpretation
	if ( summary.results.Failed + summary.results.Aborted + summary.results.PartialSuccess === 0 ) {
		prettyResult += '\n\nThe PR passes all the tests!\n';
	}

	prettyResult += '\n### Tests summary\n\n';

	for ( const test of results.results ) {
		prettyResult += `\n__${ test.name } Test Suite__\n`;
		prettyResult += `_${ test.description }_\n\n`;
		prettyResult += `<details><summary>${ getResultBadge( test.result ) } ${ getResultLabel( test.result ) }. Click to expand.</summary>\n\n`;

		prettyResult += '--- | Test | Description | Issues \n' +
			'--- | --- | --- | --- \n';

		// Create the test summary entry
		prettyResult += formatTest( test );

		// Print out the issues
		const issuesPretty = formatIssues( test );
		if ( issuesPretty ) {
			prettyResult += '\n__Issues Found:__\n\n';
			prettyResult += formatIssues( test );
		}

		prettyResult += '</details>\n';

		prettyResult += '\n---\n';
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
		await updateBuildStatus( options.commit, 'failure', 'Harmonia didn\'t finish run all the tests' );
	} else if ( summary.Failed && summary.Failed > 1 ) {
		// State: error, message: X errors found
		await updateBuildStatus( options.commit, 'failure', `${ summary.Failed } errors found` );
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
