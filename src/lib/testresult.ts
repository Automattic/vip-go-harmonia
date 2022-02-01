import Issue, { IssueType } from './issue';

export enum TestResultType {
	NotStarted,
	Success,
	PartialSuccess,
	Failed,
	Aborted
}

export type IssuesList = { [key in IssueType]: Issue[]; }

export default class TestResult {
	private readonly issuesList: Issue[];
	private testResult: TestResultType;

	constructor() {
		this.issuesList = [];
		this.testResult = TestResultType.NotStarted;
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
}
