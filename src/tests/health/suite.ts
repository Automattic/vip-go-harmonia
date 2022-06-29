import TestSuite from '../../lib/tests/testsuite';
import StaticRequestsTest from './static-requests.test';
import HomeURLsTest from './home-urls.test';
import TopRequestsTest from './top-requests.test';

export default class HealthSuite extends TestSuite {
	constructor() {
		super( 'Application health' );
	}

	setupTests() {
		this.addTest( new StaticRequestsTest() )
			.addTest( new HomeURLsTest() )
			.addTest( new TopRequestsTest() );
	}
}
