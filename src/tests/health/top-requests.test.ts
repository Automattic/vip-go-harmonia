import BaseHealthTest from './base.test';

export default class TopRequestsTest extends BaseHealthTest {
	constructor() {
		super( 'Testing with the most requested URLs',
			'Tests the availability of the some of the most requested resources in your application' );
	}

	async prepare() {
		await super.prepare();
		this.paths = this.filterPaths( this.getSiteOption( 'topRequests' ) );

		if ( ! this.paths || this.paths?.length === 0 ) {
			this.skip( 'No URLs available for testing' );
		}
	}
}
