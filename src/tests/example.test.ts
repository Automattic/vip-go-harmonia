import Test from '../lib/test';

export default class ExampleTest extends Test {
	constructor() {
		super( 'Example Test', 'This is a simple example' );
	}

	prepare() {
		console.log( 'This is the test preparation' );
	}

	async run() {
		console.log( 'The test is running.' );
		this.warning( 'Oops, a warning', 'https://example.com' );
		this.error( 'Oops, a error without documentation' );
		this.error( 'A blocker!', 'https://oops.com' );
	}
}
