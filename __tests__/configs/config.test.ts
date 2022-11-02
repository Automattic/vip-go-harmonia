import BaseConfig from '../../src/lib/configs/config';

class DummyStringConfig extends BaseConfig<string> {}
class DummyAnyConfig extends BaseConfig<any> {}
class DummySensitiveConfig extends BaseConfig<string> {
	constructor() {
		super();
		this.addSensitiveKey( 'sensitive' );
	}
}

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

	it( 'should redact sensitive keys', () => {
		const sensitiveInstance = new DummySensitiveConfig();
		sensitiveInstance.set( 'treasure', '💎' );
		sensitiveInstance.set( 'sensitive', 'this is sensitive' );

		expect( sensitiveInstance.all( true ) ).toMatchObject( {
			treasure: '💎',
			sensitive: '### REDACTED ###',
		} );

		expect( sensitiveInstance.all( false ) ).toMatchObject( {
			treasure: '💎',
			sensitive: 'this is sensitive',
		} );
	} );
} );
