import Store from './lib/stores/store';
import SiteConfig from './lib/configs/site.config';
import EnvironmentVariables from './lib/configs/envvars.config';

export default class Harmonia {
	private options: Store<any>;

	public constructor() {
		this.options = new Store();
		console.log( 'Hello World!' );
	}

	public bootstrap( siteOptions: SiteConfig, envVars: EnvironmentVariables ) {
		this.options.add( 'site', siteOptions );
		this.options.add( 'env', envVars );
	}

	public run() {

	}

	public results() {

	}
}
