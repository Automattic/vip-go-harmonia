import Test from '../../lib/tests/test';
import chalk from 'chalk';
import { executeShell } from '../../utils/shell';
import { ExecaSyncError } from 'execa';

export default class DockerBuild extends Test {
	private nodeVersion: string = '';
	private envVariables: object = {};
	constructor() {
		super( 'Builds the Docker image',
			'Tries to build the docker image and the application' );
	}

	async prepare() {
		// Get required variables
		this.nodeVersion = this.getOption( 'nodejsVersion' );
		// TODO: validate nodejs version?
		this.envVariables = this.getEnvironmentVariables();
	}

	async run() {
		this.notice( `Using Node.js ${ chalk.yellow( this.nodeVersion ) } to build the image` );
		try {
			this.notice( 'Building Docker image...' );
			const subprocess = executeShell( `bash ${ __dirname }/scripts/build.sh`, {
				...this.envVariables,
				NODE_VERSION: this.nodeVersion,
			} );

			// subprocess.stdout?.pipe( process.stdout );
			// subprocess.stderr?.pipe( process.stdout );

			await subprocess; // Wait for the Promise to finish.
		} catch ( error ) {
			// TODO: better error classification, given on the build output
			this.blocker( 'There was an error building the Docker image', undefined, error as object );
		}
	}
}
