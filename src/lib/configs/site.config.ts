import BaseConfig, { InvalidArgumentsConfig } from './config';
import semver from 'semver';

export interface SiteConfigArgs {
	siteID: number,
	nodejsVersion: string,
	repository: string,
	baseURL: string,
	packageJson?: object,
	dotenv?: object,
	topRequests?: string[],
	wait?: number,
	// Docker specific arguments
	dockerBuildEnvs?: string,
	dockerImage?: string,
	dockerHostNetwork?: boolean,
	dataOnlyImage?: string,
}

export const ALLOWED_NODEJS_VERSIONS = [ 14, 16, 18 ];

export default class SiteConfig extends BaseConfig<any> {
	constructor( args: SiteConfigArgs ) {
		super();
		this.merge( args );

		// Make sure that sensitive information can be redacted if needed
		this.addSensitiveKey( 'dockerBuildEnvs' );

		// Set default wait time of 3000ms
		if ( ! args.wait ) {
			this.set( 'wait', 3000 );
		}

		// Do not use Docker host network by default
		if ( ! args.dockerHostNetwork ) {
			this.set( 'dockerHostNetwork', false );
		}
	}

	protected validate(): boolean {
		this.validateNodeJSVersion();

		return true;
	}

	private validateNodeJSVersion() {
		if ( semver.valid( this.get( 'nodejsVersion' ) ) ) {
			return;
		}

		if ( ALLOWED_NODEJS_VERSIONS.includes( parseInt( this.get( 'nodejsVersion' ), 10 ) ) ) {
			// TODO: get latest semver for this major
			this.set( 'nodejsVersion', parseInt( this.get( 'nodejsVersion' ), 10 ) );
			return;
		}

		throw new InvalidArgumentsConfig( `Invalid Node.JS version. ${ this.get( 'nodejsVersion' ) } does not follow ` +
			`the semver standard (MAJOR.MINOR.PATCH) or is not an allowed MAJOR (${ ALLOWED_NODEJS_VERSIONS.join( ',' ) })` );
	}

	setPackageJSON( packageJSON: object ) {
		this.set( 'packageJSON', packageJSON );
	}

	isNodeJS(): boolean {
		return true;
	}

	isNextJS(): boolean {
		const dotenv = this.get( 'dotenv' );
		return !! dotenv.NEXT_PUBLIC_SERVER_URL;
	}

	getLocalURL() {
		return this.get( 'baseURL' );
	}

	getPublicURL() {
		const dotenv = this.get( 'dotenv' );

		if ( this.isNextJS() && dotenv.NEXT_PUBLIC_SERVER_URL ) {
			// Remove any extra paths
			const url = new URL( dotenv.NEXT_PUBLIC_SERVER_URL );
			return url.origin;
		}

		return this.get( 'baseURL' );
	}
}
