#! /usr/bin/env node
import * as fs from 'fs';

/**
 * Script that receives a Harmonia result JSON file, and creates the respective PRs comments
 */

const filepath = process.argv[ 2 ];
let results;
try {
	const jsonfile = fs.readFileSync( filepath, 'utf-8' );
	results = JSON.parse( jsonfile );
} catch ( error ) {
	console.error( `Error opening file ${ filepath }: ${ ( error as Error ).message }` );
	process.exit( 1 );
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

for ( const test of results.results ) {
	prettyResult += `\n__${ test.name } Test Suite__\n`;
	prettyResult += `_${ test.description }_\n\n`;
	// prettyResult += `\n#### ${ test.name } Test Suite ${ getResultBadge( test.result ) } ${ getResultLabel( test.result ) } ${ getResultBadge( test.result ) }\n` +
	//	`_${ test.description }_\n\n`;

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

console.log( prettyResult );

