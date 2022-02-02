import TestResult, { TestResultType } from './testresult';
import Issue, { IssueType } from './issue';

export default abstract class Test {
	private _name: string;
	private _description: string;

	private readonly testResult: TestResult;

	protected constructor( name: string, description: string ) {
		this._name = name;
		this._description = description;

		this.testResult = new TestResult( this );
	}

	protected prepare() { /* Empty on purpose */ }
	protected abstract run();

	public async execute(): Promise<TestResult> {
		try {
			// Prepare the test
			await this.prepare();

			// Execute the test
			await this.run();

			// Handle the results
			this.processResult();
		} catch ( error ) {
			// Since we only want to process exceptions that are Issues, rethrow the error,
			// so it can be handled outside this class.
			if ( ! ( error instanceof Issue ) ) {
				throw error;
			}

			// Handle the issue
			console.log( 'Execution aborted' );
			this.testResult.setResult( TestResultType.Aborted );
		}

		return this.testResult;
	}

	get name(): string {
		return this._name;
	}

	get description(): string {
		return this._description;
	}

	public result() {
		return this.testResult;
	}

	private processResult() {
		// If there is at least an Error, the test is considered as failed
		if ( this.testResult.getErrors().length > 0 ) {
			this.testResult.setResult( TestResultType.Failed );
			return;
		}

		// If there is at least an Warning, the test is a Partial Success
		if ( this.testResult.getWarnings().length > 0 ) {
			this.testResult.setResult( TestResultType.PartialSuccess );
			return;
		}

		// Otherwise, we can consider the test a success
		this.testResult.setResult( TestResultType.Success );
	}

	protected blocker( message: string, docUrl?: string ) {
		// If the issue is a blocker, the test should abort by throwing the issue.
		throw this.createIssue( message, docUrl )
			.setType( IssueType.Blocker );
	}

	protected error( message: string, docUrl?: string ) {
		// If there is an error, the test should be considered as failed
		this.testResult.setResult( TestResultType.Failed );
		return this.createIssue( message, docUrl )
			.setType( IssueType.Error );
	}

	protected warning( message: string, docUrl?: string ) {
		return this.createIssue( message, docUrl )
			.setType( IssueType.Warning );
	}

	protected notice( message: string, docUrl?: string ) {
		return this.createIssue( message, docUrl )
			.setType( IssueType.Notice );
	}

	private createIssue( message: string, docUrl?: string ) {
		const issue: Issue = Issue.build();

		issue.setMessage( message );

		if ( docUrl ) {
			issue.setDocumentation( docUrl );
		}

		// Store the issue
		this.testResult.addIssue( issue );

		return issue;
	}

	public toJSON() {
		return {
			name: this._name,
			description: this._description,
		};
	}
}
