import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/test';
import TestResult, { TestResultType } from './lib/testresult';
import ExampleTest from './tests/example.test';
import eventEmitter from './lib/events';

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
		this.emit( 'harmonia:bootstraping', this );
		// Validate the arguments
		siteOptions.runValidation();
		envVars.runValidation();

		// Store the arguments
		this.options.add( 'site', siteOptions )
			.add( 'env', envVars );

		this.setupTests();
		log( 'Harmonia bootstrap finished' );
		this.emit( 'harmonia:ready', this );
	}

	public async run() {
		this.emit( 'startingTests' );
		log( 'Starting the tests execution' );
		for ( const test of this.tests ) {
			// Execute the test
			this.emit( 'beforeTest', test );
			const testResult: TestResult = await test.execute();
			this.emit( 'afterTest', test, testResult );
			// If any of the tests abort, there is no point of keeping running them.
			if ( testResult.getType() === TestResultType.Aborted ) {
				this.emit( 'testAborted', test, testResult );
				log( `${ test.name } has returned an Aborted state. Halting all the tests` );
				return;
			}
		}
		this.emit( 'testsDone' );
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
		this.registerTest( new ExampleTest() );
		// Register all the necessary tests
	}

	public registerTest( test: Test ) {
		this.tests.push( test );
	}

	public on( eventName: string, listener: ( ...args: any[] ) => void ) {
		log( `Registered event listener on harmonia:${ eventName }` );
		eventEmitter.on( `harmonia:${ eventName }`, listener );
	}

	private emit( eventName: string, ...args: any[] ): boolean {
		return eventEmitter.emit( `harmonia:${ eventName }`, ...args );
	}
}
