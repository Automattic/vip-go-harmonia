import BaseConfig from './config';

export default class SiteConfig extends BaseConfig<any> {
	constructor( siteId: number, nodejsVersion: string, repository: string ) {
		super();
		this.set( 'site_id', siteId );
		this.set( 'nodejs_version', nodejsVersion );
		this.set( 'repository', repository );
	}
}
