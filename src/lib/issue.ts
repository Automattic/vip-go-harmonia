export enum IssueType {
	Notice,
	Warning,
	Error,
	Blocker
}

export default class Issue {
	public message: string;
	public documentation?: string;
	public type: IssueType;
	public data?: any;

	private constructor() {
		this.message = '';
		this.type = IssueType.Notice;
	}

	static build() {
		return new Issue();
	}

	setType( type: IssueType ): Issue {
		this.type = type;
		return this;
	}

	setMessage( message: string ): Issue {
		this.message = message;
		return this;
	}

	setDocumentation( documentation: string ): Issue {
		this.documentation = documentation;
		return this;
	}

	setData( data: object ): Issue {
		this.data = data;
		return this;
	}

	getData(): any {
		return this.data;
	}

	getTypeString(): string {
		return IssueType[ this.type ];
	}

	public toJSON(): { type: string, message:string, documentation?: string, data?: object } {
		return {
			type: IssueType[ this.type ],
			message: this.message,
			documentation: this.documentation,
			data: this.data,
		};
	}
}
