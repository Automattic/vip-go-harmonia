import Test from '../../lib/tests/test';
import chalk from 'chalk';
import { executeShell } from '../../utils/shell';
import Harmonia from '../../harmonia';

export default class DockerBuild extends Test {
	private nodeVersion: string = '';
	private envVariables: object = {};
	constructor() {
		super( 'Builds the Docker image',
			'Tries to build the docker image and the application' );
	}

	async prepare() {
		// Get required variables
		this.nodeVersion = this.getSiteOption( 'nodejsVersion' );
		this.envVariables = this.getEnvironmentVariables();

		// Check for extra build variables
		try {
			const buildEnvVars = this.getSiteOption( 'dockerBuildEnvs' );
			this.setEnvVar( 'NODE_BUILD_DOCKER_ENV', buildEnvVars );
		} catch ( error ) {
			// If there is an error (KeyDontExistError), simply ignore it, and don't set any env variable
		}
	}

	async run() {
		this.notice( `Using Node.js ${ chalk.yellow( this.nodeVersion ) } to build the image` );
		try {
			this.notice( 'Building Docker image...' );
			const subprocess = executeShell( `bash ${ __dirname }/scripts/build.sh`, {
				...this.envVariables,
				NODE_VERSION: this.nodeVersion,
			} );

			if ( Harmonia.isVerbose() ) {
				subprocess.stdout?.pipe( process.stdout );
			}
			await subprocess; // Wait for the Promise to finish.
		} catch ( error ) {
			// TODO: better error classification, given on the build output
			this.blocker( 'There was an error building the Docker image', undefined, error as object );
		}
	}
}
