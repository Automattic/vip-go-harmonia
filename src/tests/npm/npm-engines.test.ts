import Test from '../../lib/tests/test';
import chalk from 'chalk';
import semver from 'semver';

export default class NpmEnginesTest extends Test {
	private packageJSON;
	private nodeVersion;

	private npmEnginesDoc = 'https://docs.wpvip.com/technical-references/node-js/managing-node-js-versions/';
	constructor() {
		super( 'NPM `engine`', 'Validates the `engine` property, if present' );
	}

	prepare() {
		this.packageJSON = this.getSiteOption( 'packageJSON' );
		this.nodeVersion = this.getSiteOption( 'nodejsVersion' );
	}

	async run() {
		const engines = this.packageJSON.engines;

		if ( ! engines ) {
			// Engine is not set, all good.
			return;
		}

		if ( engines.node ) {
			const nodeSemVer = semver.coerce( this.nodeVersion ).version;
			if ( ! semver.satisfies( nodeSemVer, engines.node ) ) {
				this.warning( `The ${ chalk.italic( 'engine.node' ) } version in your ${ chalk.bold( 'package.json' ) } ` +
					`(${ chalk.yellow( engines.node ) }) does not satisfies the production Node.js version (${ chalk.yellow( nodeSemVer ) })`,
				this.npmEnginesDoc );
			}
		}
	}
}
