import Test from '../../lib/tests/test';
import chalk from 'chalk';
import { executeShell } from '../../utils/shell';
import waait from 'waait';
import { Md5 } from 'ts-md5/dist/md5';
import Harmonia from '../../harmonia';

export default class DockerRun extends Test {
	private nodeVersion: string = '';
	private envVariables: object = {};
	private imageTag: string = '';
	private port: number = 0;
	private containerName: string = '';

	constructor() {
		super( 'Docker run', 'Starts the application using the built Docker image' );
	}

	async prepare() {
		// Get required variables
		this.nodeVersion = this.getSiteOption( 'nodejsVersion' );
		this.envVariables = this.getEnvironmentVariables();
		this.port = this.getEnvVar( 'PORT' ) as number;

		// Get the docker image tag
		if ( ! this.get( 'dockerImage' ) ) {
			return this.blocker( "There isn't any valid Docker image that can be used to start the container." );
		}
		this.imageTag = this.get( 'dockerImage' );

		// Generate a container name
		this.containerName = 'vip_harmonia_' + Md5.hashStr( Date.now().toString() );
	}

	async run() {
		this.notice( `Running Docker image on PORT ${ chalk.yellow( this.port ) } for image ${ chalk.yellow( this.imageTag ) }...` );
		try {
			const environmentVars = {
				...this.envVariables,
				...this.getSiteOption( 'dotenv' ),
				NODE_VERSION: this.nodeVersion,
				PORT: this.port,
			};

			// Build the `--env` string of options for Docker with the environment variable keys
			const environmentVarDockerOption = Object.keys( environmentVars ).reduce( ( string, envVarName ) => {
				return `${ string } -e ${ envVarName }`;
			}, '' );

			const subprocess = executeShell( `docker run -t --network host --name ${ this.containerName } ${ environmentVarDockerOption } ${ this.imageTag }`,
				environmentVars );

			if ( Harmonia.isVerbose() ) {
				subprocess.stdout?.pipe( process.stdout );
			}

			await waait( 3000 ); // Wait a little, giving time for the server to boot up

			// If subprocess has an exit code, it means that it exited prematurely.
			// By awaiting the subprocess, we force it to resolve and handle the error in the catch block
			if ( subprocess.exitCode ) {
				await subprocess;
			}

			// Save the container ID
			this.save( 'containerName', this.containerName );
		} catch ( error ) {
			// TODO: better error classification, given on the execution output
			this.blocker( 'There was an error starting the Docker image', undefined, error as object );
		}
	}
}
