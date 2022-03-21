import Test from '../../lib/tests/test';
import chalk from 'chalk';
import { executeShell, executeShellSync } from '../../utils/shell';
import Harmonia from '../../harmonia';

export default class DockerBuild extends Test {
	private nodeVersion: string = '';
	private envVariables: object = {};

	constructor() {
		super( 'Builds the Docker image',
			'Tries to build the docker image and the application' );
	}

	async prepare() {
		// If there is a provided docker image, use it instead and skip building
		if ( this.getSiteOptions().exists( 'dockerImage' ) ) {
			const dockerImage = this.getDockerImage( this.getSiteOption( 'dockerImage' ) );
			if ( ! dockerImage ) {
				return this.blocker( `Could not find a Docker image with the reference ${ chalk.bold( this.getSiteOption( 'dockerImage' ) ) } ` );
			}

			// Save the image reference to be used in the Run step
			this.save( 'dockerImage', dockerImage );

			// Skip the Build test altogether
			return this.skip( `Using an already built Docker image tagged with '${ chalk.yellow( dockerImage ) }'. ` );
		}

		if ( this.getSiteOptions().exists( 'dataOnlyImage' ) ) {
			const dataOnlyImage = this.getDockerImage( this.getSiteOption( 'dataOnlyImage' ) );
			if ( ! dataOnlyImage ) {
				return this.blocker( `Could not find a Docker image with the reference ${ chalk.bold( this.getSiteOption( 'dataOnlyImage' ) ) } ` );
			}

			this.save( 'dataOnlyImage', dataOnlyImage );
		}

		// Get required variables
		this.nodeVersion = this.getSiteOption( 'nodejsVersion' );
		this.envVariables = this.getEnvironmentVariables();

		// Check for extra build variables
		if ( this.getSiteOptions().exists( 'dockerBuildEnvs' ) ) {
			const buildEnvVars = this.getSiteOption( 'dockerBuildEnvs' );
			this.setEnvVar( 'NODE_BUILD_DOCKER_ENV', buildEnvVars );
		}
	}

	async run() {
		this.notice( `Using Node.js ${ chalk.yellow( this.nodeVersion ) } to build the image` );
		try {
			this.notice( 'Building Docker image...' );

			// If a data-only image is provided, build the container using it instead.
			if ( this.get( 'dataOnlyImage' ) ) {
				await this.buildWithData( this.get( 'dataOnlyImage' ) );
				return;
			}

			await this.buildApp();
		} catch ( error ) {
			// TODO: better error classification, given on the build output
			this.blocker( 'There was an error building the Docker image', undefined, error as object );
		}
	}

	/**
	 * Builds the full application image, that is fully functional.
	 *
	 * @private
	 */
	private async buildApp(): Promise<string> {
		const subprocess = executeShell( `bash ${ __dirname }/scripts/build-app/build.sh`, {
			...this.envVariables,
			NODE_VERSION: this.nodeVersion,
		} );

		if ( Harmonia.isVerbose() ) {
			subprocess.stdout?.pipe( process.stdout );
		}

		// Store the image name for the next step
		const commitSHA = executeShellSync( 'git rev-parse HEAD' ).stdout;
		const imageTag = `vip-harmonia:${ commitSHA }`;

		this.save( 'dockerImage', imageTag );

		await subprocess; // Wait for the Promise to finish.

		return imageTag;
	}

	/**
	 * Builds the application image, using an existing data-only image to provide the application data and codebase.
	 *
	 * @param dataImage
	 * @private
	 */
	private async buildWithData( dataImage: string ): Promise<string> {
		this.notice( `Using a data-only image ${ chalk.yellow( dataImage ) } ` );

		const subprocess = executeShell( `bash ${ __dirname }/scripts/data-only/build.sh`, {
			NODE_VERSION: this.nodeVersion,
			DATAONLY_IMAGE: dataImage,
		} );

		if ( Harmonia.isVerbose() ) {
			subprocess.stdout?.pipe( process.stdout );
		}

		// Store the image name for the next step
		const commitSHA = executeShellSync( 'git rev-parse HEAD' ).stdout;
		const imageTag = `vip-harmonia:${ commitSHA }`;

		this.save( 'dockerImage', imageTag );

		await subprocess; // Wait for the Promise to finish.

		return imageTag;
	}

	/**
	 * Given a docker image reference, returns the image repository and tag, in the format
	 * "vip-harmonia:32fdec3a94b66c43144999cb4834dee3caeb379e"
	 *
	 * @param dockerImage
	 * @private
	 */
	private getDockerImage( dockerImage: string ): string|boolean {
		try {
			const subprocess = executeShellSync( `docker images --filter reference=${ dockerImage } --format {{.Repository}}:{{.Tag}}` );

			if ( subprocess.stdout === '' || subprocess.exitCode !== 0 ) {
				return false;
			}

			// `docker images` might return a list of all the images matching. Since we want the newest one, get the first
			const images = subprocess.stdout.split( '\n' );
			return images[ 0 ];
		} catch ( e ) {
			return false;
		}
	}
}
