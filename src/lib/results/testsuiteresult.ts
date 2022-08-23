import TestResult, { TestResultType } from './testresult';
import Test from '../tests/test';
import Issue from '../issue';
import TestSuite from '../tests/testsuite';

export default class TestSuiteResult extends TestResult {
	private readonly _tests: Test[];

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
		const json: any = {
			...this.test().toJSON(),
			result: this.getTypeString(),
			tests: this.results(),
		};

		if ( this.getLastIssue() ) {
			json.issue = this.getLastIssue();
		}
		return json;
	}
}
