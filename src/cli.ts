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
	{ name: 'path', type: String, defaultValue: process.cwd() },
	{ name: 'help', alias: 'h', type: Boolean },
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
				defaultOption: 'false',
				description: 'Output only the JSON results of the tests',
			},
			{
				name: 'path',
				typeLabel: '{underline Path}',
				defaultOption: process.cwd(),
				description: `Path for the project where tests should execute (${ process.cwd() })`,
			},
			{
				name: 'help',
				description: 'Print this usage guide',
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

// Create the Harmonia object
const harmonia = new Harmonia();

// Register some events handlers
harmonia.on( 'ready', ha => {
	console.log( 'Harmonia is ready! ' );
} );

// Create the Config objects
const siteOptions = new SiteConfig( {
	siteID: options.site,
	nodejsVersion: options[ 'node-version' ],
	repository: 'wpcom/test',
} );
const envVars = new EnvironmentVariables( {} );

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

// Bootstrap
try {
	harmonia.bootstrap( siteOptions, envVars );
} catch ( error ) {
	if ( error instanceof Error ) {
		console.error( chalk.bold.redBright( 'Error:' ), error.message ?? error );
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

harmonia.on( 'afterTestSuite', ( suite: TestSuite, result: TestSuiteResult ) => {
	console.log( ` >> Finished running ${ chalk.bold( suite.name ) } suite` );
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
			console.log( `  ${ chalk.bgRed( 'Test failed.' ) } - There were ${ result.getErrors().length } errors.` );
			break;
		case TestResultType.PartialSuccess:
			console.log( `  ${ chalk.bgYellow( 'Test partially failed.' ) } - There were ${ result.issues().length } issues found.` );
			break;
		case TestResultType.Aborted:
			console.log( `  ${ chalk.bgRedBright.underline( 'Test aborted!' ) } - There was a critical error that makes`,
				'the application fully incompatible with VIP Go.' );
			break;
	}
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

	console.log( `    ${ issueTypeString } \t ${ issue.message } ${ documentation }` );

	// If it's a Blocker or Error, and the issue includes a stdout, print it out.
	const issueData = issue.getData();
	if ( [ IssueType.Blocker, IssueType.Error ].includes( issue.type ) && issueData?.all ) {
		console.log( issueData.all );
		console.log();
	}
} );

harmonia.run().then( ( results: TestResult[] ) => {
	// Re-enable the output
	if ( options.json ) {
		enableOutput();
		console.log( harmonia.resultsJSON() );
	}
	process.exit( 0 );
} );

