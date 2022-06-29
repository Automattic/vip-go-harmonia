import Test from './test';
import TestResult, { TestResultType } from '../results/testresult';
import Store from '../stores/store';
import TestSuiteResult from '../results/testsuiteresult';
import Issue from '../issue';

export default class TestSuite extends Test {
	private readonly _tests: Test[];

	protected readonly testResult: TestSuiteResult;

	constructor( name: string, description?: string ) {
		super( name, description );
		this._tests = [];
		this.testResult = new TestSuiteResult( this );

		this.setupTests();
	}

	run() { /* empty*/ }
	setupTests() { /* empty */ }

	public async execute(): Promise<TestResult> {
		try {
			this.emit( 'beforeTestSuite', this );
			this.log( 'Executing test suite' );

			// Prepare the test
			await this.prepare();

			// Execute the tests
			for ( const test of this._tests ) {
				const testResult = await test.execute();

				if ( testResult.getType() === TestResultType.Aborted ) {
					throw testResult.getLastIssue();
				}
			}

			// Process the results
			this.processResult();
		} catch ( issue ) {
			if ( ! ( issue instanceof Issue ) ) {
				// Since we only want to process exceptions that are Issues, rethrow the error,
				// so it can be handled outside this class.
				throw issue;
			}
			this.testResult.setResult( TestResultType.Aborted );
			this.log( `${ this.name } has returned an Aborted state. Halting all the tests in the suite` );
		} finally {
			// Clean-up after test
			this.emit( 'testSuiteCleanUp', this, this.testResult );
			await this.cleanUp();
		}

		this.emit( 'afterTestSuite', this, this.testResult );

		return this.testResult;
	}

	protected processResult() {
		if ( this.testResult.getType() === TestResultType.Aborted ) {
			return;
		}
		super.processResult();
	}

	tests(): Test[] {
		return this._tests;
	}

	/**
	 * Return all the TestResults of the child tests
	 */
	results(): TestResult[] {
		return this._tests.reduce( ( results: TestResult[], test: Test ) => {
			if ( test.result().getType() !== TestResultType.NotStarted ) {
				results.push( test.result() );
			}
			return results;
		}, [] );
	}

	addTest( test: Test ): TestSuite {
		this.log( `Registering test ${ test.name } (${ test.constructor.name })` );

		this._tests.push( test );
		return this;
	}

	setOptions( value: Store<any> ) {
		super.setOptions( value );
		for ( const test of this._tests ) {
			test.setOptions( value );
		}
	}
}
