import Test from '../../lib/tests/test';
import chalk from 'chalk';
import { executeShell } from '../../utils/shell';
import { createHash } from 'crypto';
import { wait } from '../../utils/wait';
import Harmonia from '../../harmonia';

export default class DockerRun extends Test {
	private nodeVersion = '';
	private envVariables = {};
	private imageTag = '';
	private port = 0;
	private wait = 3000;
	private useDockerHostNetwork = false;
	private containerName = '';

	constructor() {
		super( 'Docker run', 'Starts the application using the built Docker image' );
	}

	async prepare() {
		// Get required variables
		this.nodeVersion = this.getSiteOption( 'nodejsVersion' );
		this.envVariables = this.getEnvironmentVariables();
		this.port = this.getEnvVar( 'PORT' ) as number;
		this.wait = this.getSiteOption( 'wait' );

		this.useDockerHostNetwork = this.getSiteOption( 'dockerHostNetwork' );

		// Get the docker image tag
		if ( ! this.get( 'dockerImage' ) ) {
			return this.blocker( "There isn't any valid Docker image that can be used to start the container." );
		}
		this.imageTag = this.get( 'dockerImage' );

		// Generate a container name
		this.containerName = 'vip_harmonia_' + createHash( 'md5' )
			.update( this.imageTag + Date.now().toString() )
			.digest( 'hex' );
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

			let dockerNetwork = `-p ${ this.port }:${ this.port }`;
			// If `--docker-host-network` is set, use the host network instead of port mapping
			if ( this.useDockerHostNetwork ) {
				dockerNetwork = '--network host';
			}

			const dockerCommand = `docker run -t ${ dockerNetwork } --name ${ this.containerName } ${ environmentVarDockerOption } ${ this.imageTag }`;
			const subprocess = executeShell( dockerCommand,	environmentVars );

			if ( Harmonia.isVerbose() ) {
				subprocess.stdout?.pipe( process.stdout );
			}

			this.notice( `Waiting ${ chalk.yellow( this.wait + 'ms' ) } for the container to start...` );
			await wait( this.wait ); // Wait a little, giving time for the server to boot up

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
