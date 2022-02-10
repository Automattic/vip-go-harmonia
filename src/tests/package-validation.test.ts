import Test from '../lib/tests/test';
import chalk from 'chalk';

export default class PackageValidationTest extends Test {
	private packageJSON;
	private dependencies;

	/**
	 * List of the required packages for the node.js environment.
	 * Not having any of these packages will throw an Error.
	 * @private
	 */
	private requiredPackages = [
		'@automattic/vip-go',
	]

	/**
	 * List of optional but recommended packages
	 * @private
	 */
	private recommendedPackages = [
		'jest',
	]

	constructor() {
		super( 'Check usage of required and recommended packages',
			'Checks if the project is using the necessary packages in the production dependencies' );
	}

	prepare() {
		this.packageJSON = this.getOption( 'packageJSON' );
		this.dependencies = this.packageJSON.dependencies;
	}

	async run() {
		const dependencies = Object.keys( this.dependencies );

		for ( const requiredPackage of this.requiredPackages ) {
			if ( ! dependencies.includes( requiredPackage ) ) {
				this.error( `Missing required package ${ chalk.bold( requiredPackage ) }`, 'TBD' );
			}
		}

		for ( const recommendedPackage of this.recommendedPackages ) {
			if ( ! dependencies.includes( recommendedPackage ) ) {
				this.warning( `Missing recommended package ${ chalk.bold( recommendedPackage ) }`, 'TBD' );
			}
		}
	}
}
