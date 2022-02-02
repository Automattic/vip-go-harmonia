import Issue, { IssueType } from './issue';
import Test from './test';

export enum TestResultType {
	NotStarted,
	Success,
	PartialSuccess,
	Failed,
	Aborted
}

export default class TestResult {
	private readonly issuesList: Issue[];
	private testResult: TestResultType;
	private test: Test;

	constructor( test: Test ) {
		this.issuesList = [];
		this.testResult = TestResultType.NotStarted;
		this.test = test;
	}

	issues(): Issue[] {
		return this.issuesList;
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

	setResult( result: TestResultType ) {
		this.testResult = result;
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

	public toJSON() {
		return {
			test: this.test,
			result: TestResultType[ this.testResult ],
			issues: this.issuesList,
		};
	}
}
