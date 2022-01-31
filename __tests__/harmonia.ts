import Harmonia from '../src/harmonia';

describe( 'harmonia', () => {
	it( 'should instantiate', () => {
		const instance: Harmonia = new Harmonia();
		expect( instance ).toBeInstanceOf( Harmonia );
		expect( instance ).toHaveProperty( 'bootstrap' );
	} );
} );
