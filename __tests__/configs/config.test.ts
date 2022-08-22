import BaseConfig from '../../src/lib/configs/config';

class DummyStringConfig extends BaseConfig<string> {}
class DummyAnyConfig extends BaseConfig<any> {}

describe( 'config store', () => {
	it( 'should instantiate', () => {
		const stringInstance = new DummyStringConfig();
		const anyInstance = new DummyAnyConfig();

		expect( stringInstance ).toBeInstanceOf( BaseConfig );
		expect( anyInstance ).toBeInstanceOf( BaseConfig );
	} );

	it( 'should allow access to store', () => {
		const stringInstance = new DummyStringConfig();
		stringInstance.set( 'treasure', '💎' );

		expect( stringInstance.get( 'treasure' ) ).toBe( '💎' );
	} );
} );
