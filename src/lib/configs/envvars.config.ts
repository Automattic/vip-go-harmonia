import BaseConfig from './config';

export default class EnvironmentVariables extends BaseConfig<string|number|boolean> {
	constructor( environmentVariables: { [key: string]: string|number|boolean } ) {
		super();
		this.merge( environmentVariables );
	}
}
