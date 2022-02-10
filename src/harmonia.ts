import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/tests/test';
import TestResult, { TestResultType } from './lib/results/testresult';
import eventEmitter from './lib/events';
import stripAnsi from 'strip-ansi';
/**
 * Test imports
 */
import NpmScriptsTest from './tests/npm-scripts.test';
import PackageValidationTest from './tests/package-validation.test';
import TestSuite from './lib/tests/testsuite';
import ExampleTest from './tests/example.test';

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

	public async run(): Promise< TestResult[] > {
		this.emit( 'startingTests' );
		log( 'Starting the tests execution' );
		for ( const test of this.tests ) {
			// Execute the test
			const testResult: TestResult = await test.execute();

			// If any of the tests abort, there is no point of keeping running them.
			if ( testResult.getType() === TestResultType.Aborted ) {
				log( `${ test.name } has returned an Aborted state. Halting all the tests` );
				break;
			}
		}
		this.emit( 'testsDone', this.results() );
		log( 'All tests have been executed' );
		return this.results();
	}

	public results(): TestResult[] {
		return this.tests.reduce( ( results: TestResult[], test: Test ) => {
			if ( test.result().getType() !== TestResultType.NotStarted ) {
				results.push( test.result() );
			}
			return results;
		}, [] );
	}

	public resultsJSON( strip: boolean = true ) {
		return JSON.stringify( this.results(), ( key, value ) => {
			if ( strip && typeof value === 'string' ) {
				return stripAnsi( value );
			}
			return value;
		} );
	}

	private setupTests() {
		log( 'Setting up the tests' );
		// Register all the necessary tests
		this.registerTest( new TestSuite( 'Node.JS', 'Test a node.JS site' )
			.addTest( new NpmScriptsTest() )
			.addTest( new PackageValidationTest() ) );

		this.registerTest( new TestSuite( 'Docker', 'Builds and executes the docker environment' )
			.addTest( new ExampleTest() ) );
	}

	public registerTest( test: Test ) {
		log( `Registering test ${ test.name } (${ test.constructor.name })` );
		test.setOptions( this.options );	// Set the test options
		this.tests.push( test );			// Store the test
	}

	public on( eventName: string, listener: ( ...args: any[] ) => void ) {
		log( `Registered event listener on harmonia:${ eventName }` );
		eventEmitter.on( `harmonia:${ eventName }`, listener );
	}

	private emit( eventName: string, ...args: any[] ): boolean {
		return eventEmitter.emit( `harmonia:${ eventName }`, ...args );
	}
}

