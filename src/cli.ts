#!/usr/bin/env node
import Harmonia from './harmonia';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import chalk from 'chalk';
import path from 'path';
import Test from './lib/test';
import TestResult from './lib/testresult';
import Issue from './lib/issue';

console.log( '  /\\  /\\__ _ _ __ _ __ ___   ___  _ __ (_) __ _ ' );
console.log( ' / /_/ / _` | \'__| \'_ ` _ \\ / _ \\| \'_ \\| |/ _` |' );
console.log( '/ __  / (_| | |  | | | | | | (_) | | | | | (_| |' );
console.log( '\\/ /_/ \\__,_|_|  |_| |_| |_|\\___/|_| |_|_|\\__,_|' );
console.log( 'VIP Harmonia - Application testing made easy' );
console.log();

const randomPort = Math.floor( Math.random() * 1000 ) + 3001; // Get a PORT from 3001 and 3999

const optionDefinitions = [
	{ name: 'site', alias: 's', type: Number },
	{ name: 'node-version', alias: 'n', type: String },
	{ name: 'port', alias: 'p', type: Number, defaultValue: randomPort },
	{ name: 'wait', alias: 'w', type: Number, defaultValue: 3000 },
	{ name: 'verbose', type: Boolean, defaultValue: false },
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
				description: 'Select a specific target Node.JS version in semver format (MAJOR.MINOR.PATCH)',
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
				name: 'help',
				description: 'Print this usage guide',
			},
		],
	},
];

if ( options.help ) {
	console.log( commandLineUsage( optionsSections ) );
	process.exit();
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
const packageJSONfile = path.join( process.cwd(), 'package.json' );
let packageJSON;
try {
	packageJSON = require( packageJSONfile );
	siteOptions.setPackageJSON( packageJSON );
} catch ( error ) {
	console.error( chalk.bold.redBright( 'Error:' ),
		`Could not find a ${ chalk.yellow( 'package.json' ) } in the current folder (${ process.cwd() }).` );
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
harmonia.on( 'beforeTest', ( test: Test ) => {
	console.log( `  [ ${ chalk.bold( test.name ) } ] - ${ test.description }` );
} );

harmonia.on( 'afterTest', ( test: Test, result: TestResult ) => {
	const issues = result.issues();
	console.log( `  Test finished. Test finished with ${ result.getTypeString() } and ${ issues.length } issues` );
} );

harmonia.on( 'issue', ( issue: Issue ) => {
	console.log( `    [${ issue.getTypeString() }] ${ issue.message } (${ issue.documentation })` );
} );

harmonia.run().then( () => {
	console.log( chalk.green( 'Yaay.' ) );
	process.exit( 0 );
} );
