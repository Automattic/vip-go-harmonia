import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/tests/test';
import TestResult, { TestResultType } from './lib/results/testresult';
import eventEmitter from './lib/events';
import stripAnsi from 'strip-ansi';
import { cleanUp } from './utils/shell';
import Issue from './lib/issue';

/**
 * Test imports
 */
import NpmScriptsTest from './tests/npm-scripts.test';
import PackageValidationTest from './tests/package-validation.test';
import TestSuite from './lib/tests/testsuite';
import DockerSuite from './tests/docker/suite';
import HealthSuite from './tests/health/suite';

const log = require( 'debug' )( 'harmonia' );

export default class Harmonia {
	private options: Store<any>;
	private tests: Test[];

	private static verbose: boolean = false;

	public constructor() {
		this.options = new Store();
		this.tests = [];

		log( 'Harmonia class initialized' );

		// Shutdown handlers
		process.on( 'SIGINT', this.shutdownHandler.bind( this ) );
		process.on( 'SIGTERM', this.shutdownHandler.bind( this ) );
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

		this.shutdown();

		return this.results( true );
	}

	public results( includeSuites = false ): TestResult[] {
		return this.tests.reduce( ( results: TestResult[], test: Test ) => {
			if ( test.result().getType() === TestResultType.NotStarted ) {
				return results;
			}

			if ( test instanceof TestSuite ) {
				// If it's a TestSuite, go deep into the suite results and merge it with the reduced array
				if ( includeSuites ) {
					results.push( test.result() );
				}
				results = [ ...results, ...test.results() ];
				return results;
			}

			results.push( test.result() );
			return results;
		}, [] );
	}

	public allIssues(): Issue[] {
		return this.results().reduce( ( issues: Issue[], result: TestResult ) => {
			issues = [ ...issues, ...result.issues() ];
			return issues;
		}, [] );
	}

	public resultsJSON( strip: boolean = true ) {
		// Get the results of the tests, but not go deep, ie, if it's a test suite, simply get and store the testSuiteResult
		const resultsNotDeep = this.tests.reduce( ( results: TestResult[], test: Test ) => {
			if ( test.result().getType() === TestResultType.NotStarted ) {
				return results;
			}
			results.push( test.result() );
			return results;
		}, [] );

		return JSON.stringify( resultsNotDeep, ( key, value ) => {
			if ( strip && typeof value === 'string' ) {
				return stripAnsi( value );
			}
			return value;
		} );
	}

	toJSON() {
		return this.resultsJSON( true );
	}

	private setupTests() {
		log( 'Setting up the tests' );
		// Register all the necessary tests
		this.registerTest( new TestSuite( 'Node.JS', 'Test a node.JS site' )
			.addTest( new NpmScriptsTest() )
			.addTest( new PackageValidationTest() ) );

		this.registerTest( new DockerSuite() );
		this.registerTest( new HealthSuite() );
	}

	public registerTest( test: Test ) {
		log( `Registering test ${ test.name } (${ test.constructor.name })` );
		test.setOptions( this.options );	// Set the test options
		this.tests.push( test );			// Store the test
	}

	/**
	 * Runs when Harmonia shutdowns. Used to clean-up.
	 * @private
	 */
	private shutdown() {
		log( 'Shutting down Harmonia' );
		this.emit( 'shutdown' );

		// Clean-up any lingering shell processes
		cleanUp();
	}

	private shutdownHandler() {
		this.shutdown();
		process.exit( 1 );
	}

	public on( eventName: string, listener: ( ...args: any[] ) => void ) {
		log( `Registered event listener on harmonia:${ eventName }` );
		eventEmitter.on( `harmonia:${ eventName }`, listener );
	}

	private emit( eventName: string, ...args: any[] ): boolean {
		return eventEmitter.emit( `harmonia:${ eventName }`, ...args );
	}

	public static setVerbosity( flag = true ) {
		Harmonia.verbose = true;
	}

	public static isVerbose(): boolean {
		return this.verbose;
	}
}

