import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/test';

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

	public run() {
		for ( const test of this.tests ) {
			console.log( `Executing test ${ test.name } - ${ test.description }` );
			test.execute(); // Execute the test
			console.log( test.result() );
		}
	}

	public results() {

	}

	private setupTests() {
		// Register all the necessary tests
	}

	public registerTest( test: Test ) {
		this.tests.push( test );
	}
}
