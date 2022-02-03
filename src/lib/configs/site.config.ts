import BaseConfig, { InvalidArgumentsConfig } from './config';
import semver from 'semver';

export interface SiteConfigArgs {
	siteID: number,
	nodejsVersion: string,
	repository: string,
	packageJson?: object,
}

export default class SiteConfig extends BaseConfig<any> {
	constructor( args: SiteConfigArgs ) {
		super();
		this.merge( args );
	}

	protected validate(): boolean {
		if ( ! semver.valid( this.get( 'nodejsVersion' ) ) ) {
			throw new InvalidArgumentsConfig( `Invalid Node.JS version. ${ this.get( 'nodejsVersion' ) } does not follow ` +
				'the semver standard (MAJOR.MINOR.PATCH)' );
		}

		return true;
	}

	setPackageJSON( packageJSON: object ) {
		this.set( 'packageJSON', packageJSON );
	}
}
