import TestResult, { TestResultType } from './testresult';
import Issue, { IssueType } from './issue';
import eventEmitter from './events';

export default abstract class Test {
	private _name: string;
	private _description: string;

	private readonly testResult: TestResult;

	protected constructor( name: string, description: string ) {
		this._name = name;
		this._description = description;

		this.testResult = new TestResult( this );
		this.log( `${ this.constructor.name } has been initialized` );
	}

	protected prepare() { /* Empty on purpose */ }
	protected abstract run();

	public async execute(): Promise<TestResult> {
		try {
			this.log( 'Executing test' );

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
			this.log( 'Execution aborted' );
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
		this.log( 'Processing the test results' );

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
		const issue = this.createIssue( message, docUrl )
			.setType( IssueType.Blocker );
		this.emit( 'issue', issue );
		// If the issue is a blocker, the test should abort by throwing the issue.
		throw issue;
	}

	protected error( message: string, docUrl?: string ) {
		const issue = this.createIssue( message, docUrl )
			.setType( IssueType.Error );

		// If there is an error, the test should be considered as failed
		this.testResult.setResult( TestResultType.Failed );

		this.emit( 'issue', issue );
		return issue;
	}

	protected warning( message: string, docUrl?: string ) {
		const issue = this.createIssue( message, docUrl )
			.setType( IssueType.Warning );
		this.emit( 'issue', issue );
		return issue;
	}

	protected notice( message: string, docUrl?: string ) {
		const issue = this.createIssue( message, docUrl )
			.setType( IssueType.Notice );
		this.emit( 'issue', issue );
		return issue;
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

	private log( message ) {
		require( 'debug' )( `test:${ this.constructor.name }` )( message );
	}

	private emit( eventName: string, ...args: any[] ): boolean {
		return eventEmitter.emit( `harmonia:${ eventName }`, ...args );
	}
}
