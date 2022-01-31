import BaseConfig from '../../src/lib/configs/config';

class DummyStringConfig extends BaseConfig<string> {
	constructor() {
		super();
	}
}
class DummyAnyConfig extends BaseConfig<any> {
	constructor() {
		super();
	}
}

describe( 'config store', () => {
	it( 'should instantiate', () => {
		const stringInstance = new DummyStringConfig();
		const anyInstance = new DummyAnyConfig();

		expect( stringInstance ).toBeInstanceOf( BaseConfig );
		expect( anyInstance ).toBeInstanceOf( BaseConfig );
	} );
} );
