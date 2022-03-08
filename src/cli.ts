#! /usr/bin/env node
import Harmonia from './harmonia';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import SiteConfig, { ALLOWED_NODEJS_VERSIONS } from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import chalk from 'chalk';
import path from 'path';
import Test from './lib/tests/test';
import TestResult, { TestResultType } from './lib/results/testresult';
import Issue, { IssueType } from './lib/issue';
import TestSuite from './lib/tests/testsuite';
import TestSuiteResult from './lib/results/testsuiteresult';
import { setCwd } from './utils/shell';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { isWebUri } from 'valid-url';
import * as fs from 'fs';

let consolelog;
function supressOutput() {
	consolelog = console.log;
	console.log = () => {};
}

function enableOutput() {
	console.log = consolelog;
}

const randomPort = Math.floor( Math.random() * 1000 ) + 3001; // Get a PORT from 3001 and 3999

const optionDefinitions = [
	{ name: 'site', alias: 's', type: Number },
	{ name: 'node-version', alias: 'n', type: String },
	{ name: 'port', alias: 'p', type: Number, defaultValue: randomPort },
	{ name: 'wait', alias: 'w', type: Number, defaultValue: 3000 },
	{ name: 'verbose', type: Boolean, defaultValue: false },
	{ name: 'json', type: Boolean, defaultValue: false },
	{ name: 'output', alias: 'o', type: String, defaultValue: '' },
	{ name: 'path', type: String, defaultValue: process.cwd() },
	{ name: 'test-url', lazyMultiple: true, type: String },
	{ name: 'help', alias: 'h', type: Boolean },
	{ name: 'docker-build-env', type: String },
];

const options = commandLineArgs( optionDefinitions );

const optionsSections = [
	{
		header: 'VIP Go Harmonia',
		content: 'Run test and checks on your VIP Go application and validate the application functionality and responsiveness on a VIP environment',
	},
	{
		header: 'Options',
		optionList: [
			{
				name: 'site',
				alias: 's',
				typeLabel: '{underline Site ID}',
				description: 'Specify the VIP Go site ID that will be tested',
			},
			{
				name: 'node-version',
				alias: 'n',
				typeLabel: '{underline Version}',
				description: 'Select a specific target Node.JS version in semver format (MAJOR.MINOR.PATCH) or an allowed MAJOR (' + ALLOWED_NODEJS_VERSIONS.join( ', ' ) + ')',
			},
			{
				name: 'wait',
				alias: 'w',
				typeLabel: '{underline Number}',
				defaultOption: '3000',
				description: 'Configure time to wait (in milliseconds) for command to execute',
			},
			{
				name: 'port',
				alias: 'p',
				typeLabel: '{underline Number}',
				defaultOption: 'random port between 3001 and 3999',
				description: 'Port to be used for the application server. Defaults to a random port between 3001 and 3999',
			},
			{
				name: 'verbose',
				typeLabel: '{underline Boolean}',
				defaultOption: 'false',
				description: 'Increase logging level to include app build and server boot up messages',
			},
			{
				name: 'json',
				type: Boolean,
				defaultOption: 'false',
				description: 'Output only the JSON results of the tests',
			},
			{
				name: 'output',
				alias: 'o',
				typeLabel: '{underline path/to/file.json}',
				description: 'Save the test results on the specified JSON file',
			},
			{
				name: 'path',
				typeLabel: '{underline Path}',
				defaultOption: process.cwd(),
				description: `Path for the project where tests should execute (${ process.cwd() })`,
			},
			{
				name: 'test-url',
				typeLabel: '{underline URL or JSON array}',
				defaultOption: 'None',
				description: 'Add a URL that should be tested in the health-check. Can be added multiple times or be a JSON string.',
			},
			{
				name: 'help',
				type: Boolean,
				description: 'Print this usage guide',
			},
		],
	},
	{
		header: 'Docker-specific options',
		content: 'Docker-specific options',
		optionList: [
			{
				name: 'docker-build-env',
				typeLabel: '{underline String}',
				description: 'Environment variables exports to be used in the docker build. The format must match a Linux variable definition, e.g.:\n' +
					'export var1="value1"\\nexport var2="value2"',
			},
		],
	},
];

// If the JSON option is enabled, all the stdout should be suppressed to prevent polluting the output.
if ( options.json ) {
	supressOutput();
}

console.log( '  /\\  /\\__ _ _ __ _ __ ___   ___  _ __ (_) __ _ ' );
console.log( ' / /_/ / _` | \'__| \'_ ` _ \\ / _ \\| \'_ \\| |/ _` |' );
console.log( '/ __  / (_| | |  | | | | | | (_) | | | | | (_| |' );
console.log( '\\/ /_/ \\__,_|_|  |_| |_| |_|\\___/|_| |_|_|\\__,_|' );
console.log( 'VIP Harmonia - Application testing made easy' );
console.log();

if ( options.help ) {
	console.log( commandLineUsage( optionsSections ) );
	process.exit();
}

if ( options.path ) {
	setCwd( options.path );
}

// If output file was passed, try to create it.
let outputStream;
if ( options.output ) {
	outputStream = fs.createWriteStream( options.output );
}

// Create the Harmonia object
const harmonia = new Harmonia();

// Register some events handlers
harmonia.on( 'ready', () => {
	console.log( 'Harmonia is ready! ' );
} );

// Get extra URLs for testing
let testURLs: string[] = options[ 'test-url' ] ?? [];
// If it's an array of elements, use them
if ( options[ 'test-url' ]?.length === 1 ) {
	try {
		// Get the first element, if it's a string, try to convert to json
		const firstElem = options[ 'test-url' ][ 0 ];
		const jsonURLs = JSON.parse( firstElem );

		testURLs = jsonURLs;
	} catch ( error ) {	}
}

// Test the URLs array and make sure they are valid URLs
if ( testURLs && ! testURLs.every( url => isWebUri( url ) ) ) {
	console.error( chalk.bold.redBright( 'Error:' ),
		`The provided values of ${ chalk.bold( '--test-url' ) } contains at least an invalid URL` );
	process.exit( 1 );
}

// Create the Site Config objects
const siteOptions = new SiteConfig( {
	siteID: options.site,
	nodejsVersion: options[ 'node-version' ],
	repository: 'wpcom/test',
	baseURL: 'http://localhost:' + options.port,
	topRequests: testURLs,
} );

// Get package.json
const packageJSONfile = path.resolve( options.path, 'package.json' );
let packageJSON;
try {
	packageJSON = require( packageJSONfile );
	siteOptions.setPackageJSON( packageJSON );
} catch ( error ) {
	console.error( chalk.bold.redBright( 'Error:' ),
		`Could not find a ${ chalk.yellow( 'package.json' ) } in the current folder (${ options.path }).` );
	process.exit( 1 );
}

// Get the Docker build environment variables
if ( options[ 'docker-build-env' ] ) {
	// Very ugly format validation
	const dockerBuildEnvs = options[ 'docker-build-env' ];
	if ( ! dockerBuildEnvs.includes( 'export' ) || ! dockerBuildEnvs.includes( '=' ) ) {
		console.error( chalk.bold.redBright( 'Error:' ),
			`Invalid format for the ${ chalk.bold( 'docker-build-env' ) } argument. ` );
		console.log( commandLineUsage( optionsSections[ 2 ] ) );
		process.exit( 1 );
	}
	// Store it
	siteOptions.set( 'dockerBuildEnvs', dockerBuildEnvs );
}

// Get from .env, if exists
let dotenvOptions: object = {};
try {
	const dotenvPath = path.resolve( options.path, '.env' );
	const dotenvContent = readFileSync( dotenvPath );
	dotenvOptions = dotenv.parse( dotenvContent );
	// Save dotenv in the site config
} catch ( error ) {
	// nothing
}
siteOptions.set( 'dotenv', dotenvOptions );

// Create the EnviornmentVariables object
const envVars = new EnvironmentVariables( {
	PORT: options.port,
} );

// Bootstrap
try {
	harmonia.bootstrap( siteOptions, envVars );
} catch ( error ) {
	if ( error instanceof Error ) {
		console.error( chalk.bold.redBright( 'Error:' ), ( error as Error ).message ?? error );
	} else {
		console.error( error );
	}
	console.log( commandLineUsage( optionsSections ) );
	process.exit( 1 );
}

// Now we run the tests :)
console.log( ` * Running tests for the ${ packageJSON.name } app (@${ options.site })...` );
console.log();

// Register the event handlers to output some information during the execution
harmonia.on( 'beforeTestSuite', ( suite: TestSuite ) => {
	console.log( ` >> Running test suite ${ chalk.bold( suite.name ) } - ${ chalk.italic( suite.description ) } ` );
	console.log();
} );

harmonia.on( 'beforeTest', ( test: Test ) => {
	console.log( `  [ ${ chalk.bold( test.name ) } ] - ${ test.description }` );
} );

harmonia.on( 'afterTest', ( test: Test, result: TestResult ) => {
	switch ( result.getType() ) {
		case TestResultType.Success:
			console.log( `  ${ chalk.bgGreen( 'Test passed with no errors' ) }` );
			break;
		case TestResultType.Failed:
			console.log( `  ${ chalk.bgRed( `Test failed with ${ result.getErrors().length } errors..` ) }` );
			break;
		case TestResultType.PartialSuccess:
			console.log( `  ${ chalk.bgYellow( 'Test partially succeeded.' ) }` );
			break;
		case TestResultType.Aborted:
			console.log( `  ${ chalk.bgRedBright.underline( 'Test aborted!' ) } - There was a critical error that makes`,
				'the application fully incompatible with VIP Go.' );
			break;
		case TestResultType.Skipped:
			const skippedIssue = result.getLastNotice();
			console.log( `  ${ chalk.bgGrey.bold( ' Skipped ' ) }\t${ skippedIssue.message }` );
	}
	console.log();
} );

harmonia.on( 'afterTestSuite', ( test: TestSuite, result: TestSuiteResult ) => {
	// Create a badge
	let badge;
	switch ( result.getType() ) {
		case TestResultType.Failed:
			badge = chalk.bgRed.bold( ' FAILED ' );
			break;
		case TestResultType.Aborted:
			badge = chalk.bgRedBright.underline.bold( ' ABORTED ' );
			break;
		case TestResultType.PartialSuccess:
			badge = chalk.bgYellow.bold( ' PASS ' );
			break;
		default:
			badge = chalk.bgGreen.bold( ' PASS ' );
			break;
	}

	console.log( ` >> ${ badge } Finished running ${ chalk.bold( test.name ) } suite` );
	console.log();
} );

harmonia.on( 'issue', ( issue: Issue ) => {
	let issueTypeString = issue.getTypeString();
	switch ( issue.type ) {
		case IssueType.Blocker:
			issueTypeString = chalk.bgRedBright.underline.bold( issueTypeString );
			break;
		case IssueType.Error:
			issueTypeString = chalk.bgRed.bold( issueTypeString );
			break;
		case IssueType.Warning:
			issueTypeString = chalk.bgYellow.bold( issueTypeString );
			break;
		case IssueType.Notice:
			issueTypeString = chalk.bgGray.bold( issueTypeString );
			break;
	}

	const documentation = issue.documentation ? `(${ issue.documentation })` : '';

	// Replace \n with \n\t\t to keep new lines aligned
	const message = issue.message.replace( '\n', '\n\t\t' );
	console.log( `    ${ issueTypeString } \t${ message } ${ documentation }` );

	// If it's a Blocker or Error, and the issue includes a stdout, print it out.
	const issueData = issue.getData();
	if ( issueData && [ IssueType.Blocker, IssueType.Error ].includes( issue.type ) ) {
		if ( issueData.all ) {
			console.log( issueData.all );
			console.log();
		} else if ( typeof issueData === 'string' ) {
			console.log( issueData );
			console.log();
		}
	}
} );

harmonia.run().then( ( results: TestResult[] ) => {
	// If the output is JSON, reenable the console.log output and print-out the json format.
	if ( options.json ) {
		enableOutput();
		console.log( harmonia.resultsJSON() );
		process.exit( 0 );
	}

	// If there is a output file, write the JSON to the file
	if ( options.output ) {
		outputStream.write( harmonia.resultsJSON() );
		outputStream.on( 'error', err => console.error( `Error writing to output file at ${ options.output }: ${ err.message }` ) );
		outputStream.end();
	}

	// Calculate the results
	const resultCounter = results.reduce( ( counter: object, result: TestResult ) => {
		if ( ! counter[ result.getType() ] ) {
			counter[ result.getType() ] = 0;
		}
		counter[ result.getType() ]++;
		return counter;
	}, { } );

	const testSuiteResults = results.filter( result => result instanceof TestSuiteResult );

	// Print the results
	console.log( '\n' + chalk.bgGray( '        HARMONIA RESULTS        \n' ) );
	if ( resultCounter[ TestResultType.Skipped ] ) {
		console.log( ` ${ chalk.bold.bgGrey( ' SKIPPED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Skipped ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.Success ] ) {
		console.log( ` ${ chalk.bold.bgGreen( ' PASSED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Success ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.PartialSuccess ] ) {
		console.log( ` ${ chalk.bold.bgYellow( ' PARTIAL SUCCESS ' ) } - ${ chalk.bold( resultCounter[ TestResultType.PartialSuccess ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.Failed ] ) {
		console.log( ` ${ chalk.bold.bgRed( ' FAILED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Failed ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.Aborted ] ) {
		console.log( ` ${ chalk.bold.bgRedBright( ' ABORTED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Aborted ] ) } tests` );
	}

	console.log();
	console.log( ` > Total of ${ chalk.bold( results.length ) } tests executed, ${ testSuiteResults.length } of which are Test Suites.` );
	console.log();
	// If there is a Aborted test result
	if ( resultCounter[ TestResultType.Aborted ] ) {
		console.log( `${ chalk.bold.bgRedBright( '  NOT PASS  ' ) } There was a critical failure that makes the application ` +
			'incompatible with VIP Go. Please review the results and re-run the tests.' );
		process.exit( 1 );
	}

	// If there is only a partial success, but no failures
	if ( resultCounter[ TestResultType.PartialSuccess ] && ! resultCounter[ TestResultType.Failed ] ) {
		console.log( `${ chalk.bold.bgYellow( '  PASS  ' ) } The application has passed the required tests, but it does not follow all the recommendations.`,
			'Please review the results.' );
		process.exit( 0 );
	}

	// If there is a failure
	if ( resultCounter[ TestResultType.Failed ] ) {
		console.log( `${ chalk.bold.bgRed( '  NOT PASS  ' ) } The application has failed some tests, and will very likely have problems in a production ` +
			'environment. Please review all the errors found in the results.' );
		process.exit( 0 );
	}

	console.log( `${ chalk.bold.bgGreen( '  PASS  ' ) } Congratulations. The application passes all the tests.` );
	process.exit( 0 );
} );

