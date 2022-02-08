import Test from './test';
import TestResult, { TestResultType } from './testresult';
import Issue from './issue';
import Store from './stores/store';

export class TestSuiteResult extends TestResult {
	private _tests: Test[];

	constructor( test: TestSuite ) {
		super( test );
		this._tests = test.tests();
	}

	getBlockers(): Issue[] {
		let issues: Issue[] = [];
		for ( const test of this._tests ) {
			issues = [ ...issues, ...test.result().getBlockers() ];
		}
		return issues;
	}

	getErrors(): Issue[] {
		let issues: Issue[] = [];
		for ( const test of this._tests ) {
			issues = [ ...issues, ...test.result().getErrors() ];
		}
		return issues;
	}

	getWarnings(): Issue[] {
		let issues: Issue[] = [];
		for ( const test of this._tests ) {
			issues = [ ...issues, ...test.result().getWarnings() ];
		}
		return issues;
	}

	getNotices(): Issue[] {
		let issues: Issue[] = [];
		for ( const test of this._tests ) {
			issues = [ ...issues, ...test.result().getNotices() ];
		}
		return issues;
	}

	public results(): TestResult[] {
		return this._tests.reduce( ( results: TestResult[], test: Test ) => {
			if ( test.result().getType() !== TestResultType.NotStarted ) {
				results.push( test.result() );
			}
			return results;
		}, [] );
	}

	toJSON(): object {
		return {
			testSuite: this.test(),
			result: this.getTypeString(),
			tests: this.results(),
		};
	}
}

export default class TestSuite extends Test {
	private readonly _tests: Test[];

	protected readonly testResult: TestSuiteResult;

	constructor( name: string, description: string ) {
		super( name, description );
		this._tests = [];
		this.testResult = new TestSuiteResult( this );
	}

	run() { /* empty*/ }

	public async execute(): Promise<TestResult> {
		this.emit( 'beforeTestSuite', this );
		this.log( 'Executing test suite' );

		// Prepare the test
		await this.prepare();

		// Execute the tests
		for ( const test of this._tests ) {
			const testResult = await test.execute();

			if ( testResult.getType() === TestResultType.Aborted ) {
				this.testResult.setResult( TestResultType.Aborted );
				this.log( `${ test.name } has returned an Aborted state. Halting all the tests in the suite` );
				break;
			}
		}

		// Process the results
		this.processResult();

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
