import Test from '../../lib/tests/test';
import chalk from 'chalk';
import { executeShell } from '../../utils/shell';
import { ExecaSyncError } from 'execa';
import waait from 'waait';

export default class DockerRun extends Test {
	private nodeVersion: string = '';
	private envVariables: object = {};
	private imageTag: string = '';
	private port: number = 0;

	constructor() {
		super( 'Start and run the Docker image',
			'Tries to start the application in the built Docker image' );
	}

	async prepare() {
		// Get required variables
		this.nodeVersion = this.getOption( 'nodejsVersion' );
		this.envVariables = this.getEnvironmentVariables();
		this.port = this.getEnvVar( 'PORT' ) as number;

		// Get the image tag
		const commitSHA = ( await executeShell( 'git rev-parse HEAD' ) ).stdout;
		this.imageTag = `vip-harmonia:${ commitSHA }`;
	}

	async run() {
		this.notice( `Running Docker image on PORT ${ chalk.yellow( this.port ) } for image ${ chalk.yellow( this.imageTag ) }...` );
		try {
			const subprocess = executeShell( `docker run -t -e PORT -p ${ this.port }:${ this.port } ${ this.imageTag }`, {
				...this.envVariables,
				NODE_VERSION: this.nodeVersion,
				PORT: this.port,
			} );

			await waait( 3000 ); // Wait a little, giving time for the server to boot up

			// If subprocess has an exit code, it means that it exited prematurely.
			// By awaiting the subprocess, we force it to resolve and handle the error in the catch block
			if ( subprocess.exitCode ) {
				await subprocess;
			}
		} catch ( error ) {
			// TODO: better error classification, given on the execution output
			this.blocker( 'There was an error starting the Docker image', undefined, error as object );
		}
	}
}
