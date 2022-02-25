import Issue, { IssueType } from '../issue';
import Test from '../tests/test';

export enum TestResultType {
	NotStarted,
	Success,
	PartialSuccess,
	Failed,
	Aborted,
	Skipped,
}

export default class TestResult {
	private readonly issuesList: Issue[];
	private testResult: TestResultType;
	private _test: Test;

	constructor( test: Test ) {
		this.issuesList = [];
		this.testResult = TestResultType.NotStarted;
		this._test = test;
	}

	issues(): Issue[] {
		return this.issuesList.filter( el => el.type !== IssueType.Notice );
	}

	addIssue( issue: Issue ) {
		this.issuesList.push( issue );
	}

	hasIssues(): boolean {
		return this.issues().length > 0;
	}

	getType(): TestResultType {
		return this.testResult;
	}

	getTypeString(): string {
		return TestResultType[ this.testResult ];
	}

	setResult( result: TestResultType ) {
		this.testResult = result;
	}

	getLastIssue(): Issue {
		return this.issues()[ this.issues().length - 1 ];
	}

	getLastNotice(): Issue {
		const notices = this.issuesList.filter( el => el.type === IssueType.Notice );
		return notices[ notices.length - 1 ];
	}

	getBlockers(): Issue[] {
		return this.issuesList.filter( el => el.type === IssueType.Blocker );
	}

	getErrors(): Issue[] {
		return this.issuesList.filter( el => el.type === IssueType.Error );
	}

	getWarnings(): Issue[] {
		return this.issuesList.filter( el => el.type === IssueType.Warning );
	}

	getNotices(): Issue[] {
		return this.issuesList.filter( el => el.type === IssueType.Notice );
	}

	protected test(): Test {
		return this._test;
	}

	public toJSON(): object {
		return {
			...this._test.toJSON(),
			result: TestResultType[ this.testResult ],
			issues: this.getType() === TestResultType.Skipped ? [ this.getLastNotice(), ...this.issues() ] : this.issues(),
		};
	}
}
