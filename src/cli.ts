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
import { isBase64 } from './utils/base64';
import debug from 'debug';

const log = debug( 'harmonia-cli' );

let suppressOutput = false;
function logToConsole( ...messages: string[] ) {
	if ( suppressOutput ) {
		return;
	}

	messages.forEach( message => console.log( message ) );
}

const randomPort = Math.floor( Math.random() * 1000 ) + 3001; // Get a PORT from 3001 and 3999

const optionDefinitions = [
	{ name: 'ci', type: Boolean, defaultValue: false },
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
	{ name: 'docker-env-vars', type: String },
	{ name: 'docker-image', type: String },
	{ name: 'use-data-only-image', type: String },
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
				typeLabel: '{underline Base64 encoded string}',
				description: 'Environment variables exports to be used in the docker build. The format must be base64 encoded and match a Linux variable definition, e.g.:\n' +
					'export var1="value1"\\nexport var2="value2"',
			},
			{
				name: 'docker-env-vars',
				typeLabel: '{underline Base64 encoded string}',
				description: 'Environment variables exports to be injected to the application container. The format must be base64 encoded and match a Linux variable definition, e.g.:\n' +
					'export var1="value1"\\nexport var2="value2"',
			},
			{
				name: 'docker-image',
				typeLabel: '{underline String}',
				description: 'Bypass the Docker build step, and use a specific already built docker image to run the tests',
			},
			{
				name: 'use-data-only-image',
				typeLabel: '{underline String}',
				description: 'Bypass the application build, and use a data-only image docker image to be mounted on the testing container',
			},
		],
	},
];

if ( options.help ) {
	logToConsole( commandLineUsage( optionsSections ) );
	process.exit();
}

// If the JSON option is enabled, all the stdout should be suppressed to prevent polluting the output.
if ( options.json ) {
	suppressOutput = true;
}

logToConsole( '  /\\  /\\__ _ _ __ _ __ ___   ___  _ __ (_) __ _ ' );
logToConsole( ' / /_/ / _` | \'__| \'_ ` _ \\ / _ \\| \'_ \\| |/ _` |' );
logToConsole( '/ __  / (_| | |  | | | | | | (_) | | | | | (_| |' );
logToConsole( '\\/ /_/ \\__,_|_|  |_| |_| |_|\\___/|_| |_|_|\\__,_|' );
logToConsole( 'VIP Harmonia - Application testing made easy' );
logToConsole();

if ( options.verbose && ! options.json ) {
	Harmonia.setVerbosity( true );
}

if ( options.path ) {
	setCwd( options.path );
}

// Create the Harmonia object
const harmonia = new Harmonia();

// Register the default tests.
harmonia.registerDefaultTests();

if ( options.ci ) {
	harmonia.setSource( 'ci' );
} else {
	harmonia.setSource( 'cli' );
}

// Register some events handlers
harmonia.on( 'ready', () => {
	logToConsole( 'Harmonia is ready! ' );
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
	} catch ( error ) { /* ignore error */ }
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
	log( 'Using `docker-build-env` option.' );
	// Try to decode base64 string
	if ( ! isBase64( options[ 'docker-build-env' ] ) ) {
		console.error( chalk.bold.redBright( 'Error:' ),
			`The ${ chalk.bold( 'docker-build-env' ) } argument must be encoded in Base64.` );
		logToConsole( commandLineUsage( optionsSections[ 2 ] ) );
		process.exit( 1 );
	}

	const buffer = Buffer.from( options[ 'docker-build-env' ], 'base64' );
	const dockerBuildEnvs = buffer.toString();

	log( '`docker-build-env` decoded successfully. Value: ' + dockerBuildEnvs );

	// Very ugly format validation
	if ( ! dockerBuildEnvs.includes( 'export' ) || ! dockerBuildEnvs.includes( '=' ) ) {
		console.error( chalk.bold.redBright( 'Error:' ),
			`Invalid format for the ${ chalk.bold( 'docker-build-env' ) } argument. ` );
		logToConsole( commandLineUsage( optionsSections[ 2 ] ) );
		process.exit( 1 );
	}
	// Store it
	siteOptions.set( 'dockerBuildEnvs', dockerBuildEnvs );
}

// Create the EnviornmentVariables object
const envVars = new EnvironmentVariables( {
	PORT: options.port,
} );

// Get the Docker application env variables
if ( options[ 'docker-env-vars' ] ) {
	log( 'Using `docker-env-vars` option.' );

	// Try to decode base64 string
	if ( ! isBase64( options[ 'docker-env-vars' ] ) ) {
		console.error( chalk.bold.redBright( 'Error:' ),
			`The ${ chalk.bold( 'docker-env-vars' ) } argument must be encoded in Base64.` );
		logToConsole( commandLineUsage( optionsSections[ 2 ] ) );
		process.exit( 1 );
	}

	const buffer = Buffer.from( options[ 'docker-env-vars' ], 'base64' );
	const dockerEnvVars = buffer.toString();

	log( '`docker-env-vars` decoded successfully. Value: ' + dockerEnvVars );

	// Very ugly format validation
	if ( ! dockerEnvVars.includes( 'export' ) || ! dockerEnvVars.includes( '=' ) ) {
		console.error( chalk.bold.redBright( 'Error:' ),
			`Invalid format for the ${ chalk.bold( 'docker-env-vars' ) } argument. ` );
		logToConsole( commandLineUsage( optionsSections[ 2 ] ) );
		process.exit( 1 );
	}

	// Convert from `export` notation to key-value object
	const envMatches = dockerEnvVars.matchAll( /export (?<key>\w+)=(?:"|')(?<value>.*)(?:"|')/gm );
	for ( const match of envMatches ) {
		if ( ! match.groups?.key ) {
			continue;
		}
		const key = match.groups.key;
		const value = match.groups?.value;
		// Save env var
		envVars.set( key, value );
		log( `Environment variable set. ${ key }=${ value }` );
	}
}

// Set the Docker image, if exists
if ( options[ 'docker-image' ] ) {
	siteOptions.set( 'dockerImage', options[ 'docker-image' ] );
}

// Set the data-only image, if exists
if ( options[ 'use-data-only-image' ] ) {
	siteOptions.set( 'dataOnlyImage', options[ 'use-data-only-image' ] );
}

// Get from .env, if exists
let dotenvOptions: object = {};
try {
	const dotenvPath = path.resolve( options.path, '.env' );
	const dotenvContent = readFileSync( dotenvPath );
	dotenvOptions = dotenv.parse( dotenvContent );
} catch ( error ) {
	// nothing
}
// Save dotenv in the site config
siteOptions.set( 'dotenv', dotenvOptions );

// Bootstrap
try {
	harmonia.bootstrap( siteOptions, envVars );
} catch ( error ) {
	if ( error instanceof Error ) {
		console.error( chalk.bold.redBright( 'Error:' ), ( error as Error ).message ?? error );
	} else {
		console.error( error );
	}
	logToConsole( commandLineUsage( optionsSections ) );
	process.exit( 1 );
}

// Now we run the tests :)
logToConsole( ` * Running tests for the ${ packageJSON.name } app (@${ options.site })...` );
logToConsole();

// Register the event handlers to output some information during the execution
harmonia.on( 'beforeTestSuite', ( suite: TestSuite ) => {
	logToConsole( ` >> Running test suite ${ chalk.bold( suite.name ) } - ${ chalk.italic( suite.description ) } ` );
	logToConsole();
} );

harmonia.on( 'beforeTest', ( test: Test ) => {
	logToConsole( `  [ ${ chalk.bold( test.name ) } ] - ${ test.description }` );
} );

harmonia.on( 'afterTest', ( test: Test, result: TestResult ) => {
	switch ( result.getType() ) {
		case TestResultType.Success:
			logToConsole( `  ${ chalk.bgGreen( 'Test passed with no errors' ) }` );
			break;
		case TestResultType.Failed:
			logToConsole( `  ${ chalk.bgRed( `Test failed with ${ result.getErrors().length } errors..` ) }` );
			break;
		case TestResultType.PartialSuccess:
			logToConsole( `  ${ chalk.bgYellow( 'Test partially succeeded.' ) }` );
			break;
		case TestResultType.Aborted:
			logToConsole( `  ${ chalk.bgRedBright.underline( 'Test aborted!' ) } - There was a critical error that makes`,
				'the application fully incompatible with VIP Go.' );
			break;
		case TestResultType.Skipped:
			logToConsole( `  ${ chalk.bgGrey.bold( ' Skipped ' ) }\t${ result.getLastNotice().message }` );
	}
	logToConsole();
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

	logToConsole( ` >> ${ badge } Finished running ${ chalk.bold( test.name ) } suite` );
	logToConsole();
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
	logToConsole( `    ${ issueTypeString } \t${ message } ${ documentation }` );

	// If it's a Blocker or Error, and the issue includes a stdout, print it out.
	const issueData = issue.getData();
	if ( issueData && [ IssueType.Blocker, IssueType.Error ].includes( issue.type ) ) {
		if ( issueData.all ) {
			logToConsole( issueData.all );
			logToConsole();
		} else if ( typeof issueData === 'string' ) {
			logToConsole( issueData );
			logToConsole();
		}
	}
} );

harmonia.run().then( ( results: TestResult[] ) => {
	// If there is a output file, write the JSON to the file
	if ( options.output ) {
		// If output file was passed, try to create it.
		try {
			fs.writeFileSync( options.output, harmonia.resultsJSON() );
		} catch ( error ) {
			console.error( `Error writing to output file at ${ options.output }: ${ ( error as Error ).message }` );
		}
	}

	// If the output is JSON, reenable the logToConsole output and print-out the json format.
	if ( options.json ) {
		suppressOutput = false;
		logToConsole( harmonia.resultsJSON() );
		process.exit( 0 );
	}

	// Calculate the results
	const resultCounter = harmonia.countResults( true );

	const testSuiteResults = results.filter( result => result instanceof TestSuiteResult );

	// Print the results
	logToConsole( '\n' + chalk.bgGray( '        HARMONIA RESULTS        \n' ) );
	if ( resultCounter[ TestResultType.Skipped ] ) {
		logToConsole( ` ${ chalk.bold.bgGrey( ' SKIPPED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Skipped ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.Success ] ) {
		logToConsole( ` ${ chalk.bold.bgGreen( ' PASSED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Success ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.PartialSuccess ] ) {
		logToConsole( ` ${ chalk.bold.bgYellow( ' PARTIAL SUCCESS ' ) } - ${ chalk.bold( resultCounter[ TestResultType.PartialSuccess ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.Failed ] ) {
		logToConsole( ` ${ chalk.bold.bgRed( ' FAILED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Failed ] ) } tests` );
	}
	if ( resultCounter[ TestResultType.Aborted ] ) {
		logToConsole( ` ${ chalk.bold.bgRedBright( ' ABORTED ' ) } - ${ chalk.bold( resultCounter[ TestResultType.Aborted ] ) } tests` );
	}

	logToConsole();
	logToConsole( ` > Total of ${ chalk.bold( results.length ) } tests executed, ${ testSuiteResults.length } of which are Test Suites.` );
	logToConsole();
	// If there is a Aborted test result
	if ( resultCounter[ TestResultType.Aborted ] ) {
		logToConsole( `${ chalk.bold.bgRedBright( '  NOT PASS  ' ) } There was a critical failure that makes the application ` +
			'incompatible with VIP Go. Please review the results and re-run the tests.' );
		process.exit( 1 );
	}

	// If there is only a partial success, but no failures
	if ( resultCounter[ TestResultType.PartialSuccess ] && ! resultCounter[ TestResultType.Failed ] ) {
		logToConsole( `${ chalk.bold.bgYellow( '  PASS  ' ) } The application has passed the required tests, but it does not follow all the recommendations.` );
		logToConsole( 'Please review the results.' );
		process.exit( 0 );
	}

	// If there is a failure
	if ( resultCounter[ TestResultType.Failed ] ) {
		logToConsole( `${ chalk.bold.bgRed( '  NOT PASS  ' ) } The application has failed some tests, and will very likely have problems in a production ` +
			'environment. Please review all the errors found in the results.' );
		process.exit( 0 );
	}

	logToConsole( `${ chalk.bold.bgGreen( '  PASS  ' ) } Congratulations. The application passes all the tests.` );
	process.exit( 0 );
} );

