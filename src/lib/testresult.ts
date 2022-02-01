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
	private readonly issuesList: IssuesList;
	private testResult: TestResultType;

	constructor() {
		this.issuesList = {
			[ IssueType.Blocker ]: [],
			[ IssueType.Error ]: [],
			[ IssueType.Warning ]: [],
			[ IssueType.Notice ]: [],
		};
		this.testResult = TestResultType.NotStarted;
	}

	issues(): IssuesList {
		return this.issuesList;
	}

	issuesFlat(): Issue[] {
		return Object.values( this.issuesList ).flat();
	}

	addIssue( issue: Issue ) {
		this.issuesList[ issue.type ].push( issue );
	}

	hasIssues(): boolean {
		return this.issuesFlat().length > 0;
	}

	result(): TestResultType {
		return this.testResult;
	}

	setResult( result: TestResultType ) {
		this.testResult = result;
	}

	getBlockers(): Issue[] {
		return this.issuesList[ IssueType.Blocker ];
	}

	getErrors(): Issue[] {
		return this.issuesList[ IssueType.Error ];
	}

	getWarnings(): Issue[] {
		return this.issuesList[ IssueType.Warning ];
	}

	getNotices(): Issue[] {
		return this.issuesList[ IssueType.Notice ];
	}
}
