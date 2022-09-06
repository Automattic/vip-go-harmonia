import Test from '../../lib/tests/test';
import { executeShell } from '../../utils/shell';

type PathRule = {
	explanation: string;
	patterns: RegExp[];
};

export default class DisallowedFiles extends Test {
	private rules = [
		{
			explanation: 'node_modules should not be committed to source control',
			patterns: [
				/^node_modules\//,
				/\/node_modules\//,
			],
		},
	];

	constructor() {
		super( 'Git disallowed files', 'Checks the repository for disallowed files' );
	}

	async getPaths(): Promise<string[]> {
		try {
			const { stdout } = await executeShell( 'git ls-tree -dr --name-only HEAD' );
			return stdout.split( /[\r\n]+/ );
		} catch ( err ) {
			this.blocker(
				'Unable to retrieve a list of source tree files. Is this is a git repository?',
				undefined,
				err as object
			);
			return [];
		}
	}

	evaluatePath( path: string, rule: PathRule ): boolean {
		return rule.patterns.some( pattern => pattern.test( path ) );
	}

	evaluatePaths( paths: string[] ): void {
		const brokenRules = this.rules.reduce( ( acc: string, rule ) => {
			const badPath = paths.find( path => this.evaluatePath( path, rule ) );
			if ( badPath ) {
				return `\n${ badPath }: ${ rule.explanation }`;
			}

			return acc;
		}, '' );

		if ( brokenRules.length ) {
			this.blocker( `The source tree contains disallowed files:${ brokenRules }` );
		}
	}

	async run(): Promise<void> {
		this.notice( 'Examining source tree for disallowed files...' );

		const paths = await this.getPaths();
		this.evaluatePaths( paths );
	}
}
