import Test from '../../src/lib/test';
import { TestResultType } from '../../src/lib/testresult';

class ExampleTest extends Test {
	constructor() {
		super( 'Example Test', 'This is a simple example' );
	}

	prepare() {
		console.log( 'This is the test preparation' );
	}

	run() {
		console.log( 'The test is running.' );
	}
}

describe( 'harmonia test', () => {
	it( 'should instantiate', () => {
		const test = new ExampleTest();

		expect( test.name ).toBe( 'Example Test' );
		expect( test.description ).toBe( 'This is a simple example' );
	} );

	it( 'should execute and call methods', () => {
		const test = new ExampleTest();
		jest.spyOn( test, 'prepare' );
		jest.spyOn( test, 'run' );
		// Since processResult is private, we need to mock from the prototype
		const processResultSpy = jest.spyOn( ExampleTest.prototype as any, 'processResult' );
		processResultSpy.mockImplementation( () => {} );

		// Execute
		test.execute();

		expect( test.prepare ).toHaveBeenCalled();
		expect( test.run ).toHaveBeenCalled();
		expect( processResultSpy ).toHaveBeenCalled();

		processResultSpy.mockRestore();
	} );

	it( 'should abort when Test throws a blocker issue', () => {
		class TestWithBlocker extends Test {
			constructor() {
				super( 'Test', "It's a test" );
			}
			run() {
				this.warning( "It's a warning", 'http://test.com' );
				this.blocker( 'Blocker!', 'http://example.com' );
				// Below this shouldn't be executed.
				this.warning( 'This warning should not be visible', 'http://test.com' );
			}
		}

		const test = new TestWithBlocker();
		test.execute();

		expect( test.result().getType() ).toBe( TestResultType.Aborted );
		expect( test.result().getBlockers() ).toHaveLength( 1 );
		// Since the blocker should halt the execution, there should only be ONE warning in the list
		expect( test.result().getWarnings() ).toHaveLength( 1 );
		expect( test.result().issues() ).toHaveLength( 2 );
	} );
} );
