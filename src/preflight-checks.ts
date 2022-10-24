#! /usr/bin/env node
/**
 * Drop-in replacement for preflight-checks to be executed through NPX.
 * This script will ask for the required parameters, warn the user about the
 * preflight checks deprecation, and then will execute the Harmonia CLI.
 */

import chalk from 'chalk';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import childProcess from 'child_process';

import { ALLOWED_NODEJS_VERSIONS } from './lib/configs/site.config';

console.log( chalk.bold.redBright( '#### WARNING! ####' ) );
console.log( ` Running preflight-checks using ${ chalk.italic( 'npx' ) } is deprecated and is not recommended.\n` +
	' A new deployment validation tool is now bundled with VIP-CLI, and to prevent any issues with the checks,\n' +
	' we recommend using the latest VIP-CLI version, and run the checks with the following command:\n\n' +
	chalk.italic( '  # Replace 1234 with your app ID, and ' +
		'production with the environment you want to validate.\n' ) +
	chalk.italic.bold( '  $ vip @1234.production validate' )
);
console.log( chalk.bold.redBright( '##################\n' ) );

const optionDefinitions = [
	{ name: 'node-version', alias: 'n', type: Number, defaultValue: 0 },
	{ name: 'port', alias: 'p', type: Number },
	{ name: 'wait', alias: 'w', type: Number, defaultValue: 3000 },
	{ name: 'verbose', type: Boolean, defaultValue: false },
	{ name: 'help', alias: 'h', type: Boolean },
];

const options = commandLineArgs( optionDefinitions );

const optionsSections = [
	{
		header: 'VIP Go Node Preflight Checks',
		content: 'Run preflight checks on Node.js applications on VIP Go',
	},
	{
		header: 'Options',
		optionList: [
			{
				name: 'node-version',
				alias: 'n',
				typeLabel: '{underline Version}',
				defaultOption: 'false',
				description: 'Select a specific target Node.JS major version (' + ALLOWED_NODEJS_VERSIONS.join( ', ' ) + ')',
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

// Node.js version is the only requirement to be passed to Harmonia.
if ( ! options[ 'node-version' ] ) {
	const maxVersion = ALLOWED_NODEJS_VERSIONS[ ALLOWED_NODEJS_VERSIONS.length - 1 ];
	console.log( chalk.bold.yellowBright( 'WARNING: ' ) + `Node.js version not provided, defaulting to the most recent version (${ maxVersion }).` );

	options[ 'node-version' ] = maxVersion;
}

// Convert args to a argv style array
const args = Object.keys( options ).reduce( ( acc: string[], key: string ) => {
	/* eslint-disable security/detect-object-injection */
	if ( options[ key ] ) {
		acc.push( `--${ key }` );
		if ( typeof options[ key ] !== 'boolean' ) {
			acc.push( String( options[ key ] ) );
		}
	}
	return acc;
	/* eslint-enable security/detect-object-injection */
}, [] );

childProcess.fork( __dirname + '/cli.js', args );
