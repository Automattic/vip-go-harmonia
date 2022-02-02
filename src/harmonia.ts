import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/test';
import TestResult, { TestResultType } from './lib/testresult';

export default class Harmonia {
	private options: Store<any>;
	private tests: Test[];

	public constructor() {
		this.options = new Store();
		this.tests = [];

		console.log( 'Hello World!' );
	}

	public bootstrap( siteOptions: SiteConfig, envVars: EnvironmentVariables ) {
		this.options.add( 'site', siteOptions )
			.add( 'env', envVars );

		this.setupTests();
	}

	public async run() {
		for ( const test of this.tests ) {
			console.log( `Executing test ${ test.name } - ${ test.description }` );
			// Execute the test
			const testResult: TestResult = await test.execute();

			// If any of the tests abort, there is no point of keeping running them.
			if ( testResult.getType() === TestResultType.Aborted ) {
				console.error( `${ test.name } has returned an Aborted state. Halting all the tests` );
				break;
			}
		}
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
		// Register all the necessary tests
	}

	public registerTest( test: Test ) {
		this.tests.push( test );
	}
}
