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
		// TODO: Perhaps move this to a separate "CheckForDocker" test that runs before the docker tests?
		// Check if Docker is installed
		try {
			const dockerShell = await executeShell( 'docker -v' );

			if ( dockerShell.exitCode !== 0 || ! dockerShell.stdout ) {
				throw new Error;
			}

			const dockerVersion = dockerShell.stdout.match( /Docker version ([0-9]+\.[0-9]+(?:\.[0-9]+)?)/ )?.[ 1 ];
			this.notice( `Found Docker Engine ${ chalk.yellow( dockerVersion ) }` );
		} catch ( error ) {
			this.blocker( 'Looks like your environment is missing Docker. Without Docker installed on your system ' +
			"it's not possible to properly test all the application functionality." );
		}

		// Get required variables
		this.nodeVersion = this.getOption( 'nodejsVersion' );
		// TODO: validate nodejs version?
		this.envVariables = this.getEnvironmentVariables();
	}

	async run() {
		this.notice( `Using Node.js ${ chalk.yellow( this.nodeVersion ) } to build the image` );
		try {
			console.log( chalk.blue( '  Info:' ), 'Building Docker image...' );
			const subprocess = executeShell( `bash ${ __dirname }/scripts/build.sh`, {
				...this.envVariables,
				NODE_VERSION: this.nodeVersion,
			} );

			// subprocess.stdout?.pipe( process.stdout );
			// subprocess.stderr?.pipe( process.stdout );

			await subprocess; // Wait for the Promise to finish.
		} catch ( { shortMessage, all, stderr } ) {
			// TODO: better error classification, given on the build output
			this.blocker( 'There was an error building the Docker image', undefined, {
				message: shortMessage,
				output: all,
				stderr: stderr,
			} );
			console.log( chalk.red( shortMessage ) );
		}
	}
}
