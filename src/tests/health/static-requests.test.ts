import BaseHealthTest from './base.test';

export default class StaticRequestsTest extends BaseHealthTest {
	protected paths = [
		'/',
		'/cache-healthcheck?',
	]

	constructor() {
		super( 'Testing availability and response time for static URLs',
			'Checks if your app responds to requests to a subset of static URLs' );
	}

	async prepare() {
		await super.prepare();
	}
}
