import stripAnsi from 'strip-ansi';

import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';
import Test from './lib/tests/test';
import TestResult, { TestResultType } from './lib/results/testresult';
import eventEmitter from './lib/events';
import { cleanUp } from './utils/shell';
import Issue from './lib/issue';
import * as Analytics from './utils/analytics';

/**
 * Test imports
 */
import TestSuite from './lib/tests/testsuite';
import DockerSuite from './tests/docker/suite';
import HealthSuite from './tests/health/suite';
import TestSuiteResult from './lib/results/testsuiteresult';
import NPMSuite from './tests/npm/suite';

const log = require( 'debug' )( 'harmonia' );

export default class Harmonia {
	private uid: string;
	private options: Store<any>;
	private tests: Test[];
	private source: string = 'module';

	private static verbose: boolean = false;

	public constructor() {
		this.options = new Store();
		this.tests = [];
		this.uid = '';

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

		// Generate unique id for this test execution
		this.generateUID();

		this.setupTests();

		this.setupAnalytics();

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

		// Send analytics event
		await Analytics.trackEvent( 'run_finish', {
			total_tests: this.results( false ).length,
			...this.countResults( false, true ),
		} );

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

	public countResults( includeSuites: boolean = false, typeString: boolean = false ): {} {
		return this.results( includeSuites ).reduce( ( counter: object, result: TestResult ) => {
			const type = typeString ? result.getTypeString() : result.getType();
			const currentCount = counter[ type ] || 0;

			return {
				...counter,
				[ type ]: currentCount + 1,
			};
		}, { } );
	}

	public allIssues(): Issue[] {
		return this.results().reduce( ( issues: Issue[], result: TestResult ) => {
			issues = [ ...issues, ...result.issues() ];
			return issues;
		}, [] );
	}

	public getResultsSummary( results: TestResult[] ) {
		const resultCounter = results.reduce( ( counter: object, result: TestResult ) => {
			if ( ! counter[ result.getTypeString() ] ) {
				counter[ result.getTypeString() ] = 0;
			}
			counter[ result.getTypeString() ]++;
			return counter;
		}, { } );

		const testSuiteResults = results.filter( result => result instanceof TestSuiteResult );

		return {
			total: results.length,
			suites: testSuiteResults.length,
			results: resultCounter,
		};
	}

	public resultsJSON( strip: boolean = true ) {
		const object = {
			summary: this.getResultsSummary( this.results( true ) ),
			results: this.tests.reduce( ( results: TestResult[], test: Test ) => {
				if ( test.result().getType() === TestResultType.NotStarted ) {
					return results;
				}
				results.push( test.result() );
				return results;
			}, [] ),
		};

		return JSON.stringify( object, ( key, value ) => {
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
		this.registerTest( new NPMSuite() );
		this.registerTest( new DockerSuite() );
		this.registerTest( new HealthSuite() );
	}

	public registerTest( test: Test ) {
		log( `Registering test ${ test.name } (${ test.constructor.name })` );
		test.setOptions( this.options );	// Set the test options
		this.tests.push( test );			// Store the test
	}

	private generateUID(): string {
		if ( this.uid ) {
			throw new Error( `Cannot regenerate an existing UID. (${ this.uid })` );
		}

		const md5 = require( 'ts-md5/dist/md5' ).Md5;
		this.uid = md5.hashStr( JSON.stringify( this.options ) + Date.now() );

		log( `Harmonia UID set to ${ this.uid }` );
		return this.uid;
	}

	public UID(): string {
		if ( ! this.uid ) {
			return this.generateUID();
		}
		return this.uid;
	}

	private setupAnalytics() {
		// Setup base configurations
		// While we don't have a way to link the execution to a (VIP Go) user, use the UID as the user
		Analytics.setUser( this.UID(), 'anon' );
		Analytics.setBaseParams( {
			uid: this.UID(),
			source: this.source,
			...this.options.get( 'site' ).all(),
		} );

		// Send analytics event on test aborted
		this.on( 'testAborted', async ( test, testResult ) => {
			await Analytics.trackEvent( 'test_abort', {
				test: stripAnsi( test.constructor.name ),
				reason: stripAnsi( testResult.getLastIssue().message ),
			} );
		} );

		// Send analytics after each test
		this.on( 'afterTest', async ( test: Test, result: TestResult ) => {
			const data = {
				test: test.constructor.name,
				result: result.getTypeString(),
				num_errors: result.getErrors().length,
				num_warnings: result.getWarnings().length,
				num_blockers: result.getBlockers().length,
			};
			await Analytics.trackEvent( 'run_test', data );
		} );
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

	public setSource( source: string ) {
		this.source = source;
	}

	public on( eventName: string, listener: ( ...args: any[] ) => void ) {
		log( `Registered event listener on harmonia:${ eventName }` );
		eventEmitter.on( `harmonia:${ eventName }`, listener );
	}

	private emit( eventName: string, ...args: any[] ): boolean {
		return eventEmitter.emit( `harmonia:${ eventName }`, ...args );
	}

	public static setVerbosity( flag = true ) {
		Harmonia.verbose = flag;
	}

	public static isVerbose(): boolean {
		return this.verbose;
	}
}

