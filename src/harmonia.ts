import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/test';
import TestResult, { TestResultType } from './lib/testresult';

const log = require( 'debug' )( 'harmonia' );

export default class Harmonia {
	private options: Store<any>;
	private tests: Test[];

	public constructor() {
		this.options = new Store();
		this.tests = [];

		log( 'Harmonia class initialized' );
	}

	public bootstrap( siteOptions: SiteConfig, envVars: EnvironmentVariables ) {
		this.options.add( 'site', siteOptions )
			.add( 'env', envVars );

		this.setupTests();

		log( 'Harmonia bootstrap finished' );
	}

	public async run() {
		log( 'Starting the tests execution' );
		for ( const test of this.tests ) {
			// Execute the test
			const testResult: TestResult = await test.execute();

			// If any of the tests abort, there is no point of keeping running them.
			if ( testResult.getType() === TestResultType.Aborted ) {
				log( `${ test.name } has returned an Aborted state. Halting all the tests` );
				return;
			}
		}
		log( 'All tests have been executed' );
	}

	public results() {
		return this.tests.reduce( ( results: TestResult[], test: Test ) => {
			if ( test.result().getType() !== TestResultType.NotStarted ) {
				results.push( test.result() );
			}
			return results;
		}, [] );
	}

	private setupTests() {
		log( 'Setting up the tests' );
		// Register all the necessary tests
	}

	public registerTest( test: Test ) {
		this.tests.push( test );
	}
}
