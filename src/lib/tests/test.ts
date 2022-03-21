import TestResult, { TestResultType } from '../results/testresult';
import Issue, { IssueType } from '../issue';
import eventEmitter from '../events';
import Store from '../stores/store';
import SiteConfig from '../configs/site.config';

export default abstract class Test {
	private readonly _name: string;
	private readonly _description: string;

	protected readonly testResult: TestResult;
	protected _options: Store<any>;

	protected constructor( name: string, description: string ) {
		this._name = name;
		this._description = description;

		this._options = new Store<any>();
		this.testResult = new TestResult( this );
		this.log( `${ this.constructor.name } has been initialized` );
	}

	protected prepare() { /* Empty on purpose */ }
	protected abstract run();
	protected cleanUp() { /* Empty on purpose */ }

	public async execute(): Promise<TestResult> {
		try {
			this.emit( 'beforeTest', this );
			this.log( 'Executing test' );
			// Prepare the test
			await this.prepare();

			// Execute the test
			await this.run();

			// Handle the results
			this.processResult();

			this.emit( 'afterTest', this, this.testResult );
		} catch ( issue ) {
			if ( ! ( issue instanceof Issue ) ) {
				// Since we only want to process exceptions that are Issues, rethrow the error,
				// so it can be handled outside this class.
				throw issue;
			}
			// If the issue is a notice, the test has been skipped
			if ( issue.type === IssueType.Notice && this.testResult.getType() === TestResultType.Skipped ) {
				this.log( 'Execution skipped' );
				this.emit( 'testSkipped' );
			} else {
				// Otherwise, abort it
				this.log( 'Execution aborted' );
				this.testResult.setResult( TestResultType.Aborted );
				this.emit( 'testAborted', this, this.testResult );
			}
			this.emit( 'afterTest', this, this.testResult );
		} finally {
			this.emit( 'testCleanUp', this, this.testResult );
			await this.cleanUp();
		}

		return this.testResult;
	}

	get name(): string {
		return this._name;
	}

	get description(): string {
		return this._description;
	}

	public save( key: string, value: any ): boolean {
		if ( [ 'site', 'env' ].includes( key ) ) {
			return false;
		}
		this._options.set( key, value );
		return true;
	}

	public get( key: string ): any|boolean {
		try {
			return this._options.get( key );
		} catch {
			return false;
		}
	}

	public setOptions( value: Store<any> ) {
		this._options = value;
	}

	protected getSiteOption( name ): any {
		return this._options.get( 'site' ).get( name );
	}

	protected getSiteOptions(): SiteConfig {
		return this._options.get( 'site' );
	}

	protected getEnvVar( name ): string|boolean|number {
		return this._options.get( 'env' ).get( name );
	}

	protected setEnvVar( name, value ) {
		this._options.get( 'env' ).set( name, value );
	}

	protected getEnvironmentVariables(): { [key: string]: string } {
		return this._options.get( 'env' ).all();
	}

	public result() {
		return this.testResult;
	}

	protected processResult() {
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

	protected skip( message: string ) {
		const issue = this.createIssue( message )
			.setType( IssueType.Notice );

		this.testResult.setResult( TestResultType.Skipped );
		throw issue;
	}

	protected blocker( message: string, docUrl?: string, data?: object ) {
		const issue = this.createIssue( message, docUrl, data )
			.setType( IssueType.Blocker );
		this.emit( 'issue', issue );
		// If the issue is a blocker, the test should abort by throwing the issue.
		throw issue;
	}

	protected error( message: string, docUrl?: string, data?: object ) {
		const issue = this.createIssue( message, docUrl, data )
			.setType( IssueType.Error );

		// If there is an error, the test should be considered as failed
		this.testResult.setResult( TestResultType.Failed );

		this.emit( 'issue', issue );
		return issue;
	}

	protected warning( message: string, docUrl?: string, data?: object ) {
		const issue = this.createIssue( message, docUrl, data )
			.setType( IssueType.Warning );
		this.emit( 'issue', issue );
		return issue;
	}

	protected notice( message: string, docUrl?: string, data?: object ) {
		const issue = this.createIssue( message, docUrl, data )
			.setType( IssueType.Notice );
		this.emit( 'issue', issue );
		return issue;
	}

	private createIssue( message: string, docUrl?: string, data?: object ) {
		const issue: Issue = Issue.build();

		issue.setMessage( message );

		if ( docUrl ) {
			issue.setDocumentation( docUrl );
		}

		if ( data ) {
			issue.setData( data );
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

	protected log( message ) {
		require( 'debug' )( `test:${ this.constructor.name }` )( message );
	}

	protected emit( eventName: string, ...args: any[] ): boolean {
		return eventEmitter.emit( `harmonia:${ eventName }`, ...args );
	}
}
