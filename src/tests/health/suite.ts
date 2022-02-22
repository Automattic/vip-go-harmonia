import TestSuite from '../../lib/tests/testsuite';
import StaticRequestsTest from './static-requests.test';
import RandomUrlsTest from './random-urls.test';

export default class HealthSuite extends TestSuite {
	constructor() {
		super( 'Health Check', 'Tests a number of HTTP requests and looks at the response time' );
	}

	setupTests() {
		this.addTest( new StaticRequestsTest() )
			.addTest( new RandomUrlsTest() );
	}

	async prepare() {
		// TODO: get URLs
	}
}
