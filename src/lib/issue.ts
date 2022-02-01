export enum IssueType {
	Notice,
	Warning,
	Error,
	Blocker
}

export default class Issue {
	public message: string;
	public documentation: string;

	public type: IssueType;

	private constructor() {
		this.message = '';
		this.documentation = '';
		this.type = IssueType.Notice;
	}

	static build() {
		return new Issue();
	}

	setType( type: IssueType ) {
		this.type = type;
		return this;
	}

	setMessage( message: string ) {
		this.message = message;
		return this;
	}

	setDocumentation( documentation: string ) {
		this.documentation = documentation;
		return this;
	}
}
