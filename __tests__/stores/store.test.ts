import Store, { KeyAlreadyExistsError, KeyDontExistError } from '../../src/lib/stores/store';

describe( 'store', () => {
	let stringStore: Store<string>;
	let anyStore:Store;

	beforeEach( () => {
		stringStore = new Store<string>();
		anyStore = new Store();
	} );

	it( 'should instantiate', () => {
		expect( stringStore ).toBeInstanceOf( Store );
		expect( anyStore ).toBeInstanceOf( Store );
	} );

	it( 'should add elements', () => {
		stringStore.add( 'hello', 'world' );
		stringStore.set( 'world', 'hello' );

		/* eslint dot-notation: "off" */
		expect( Object.keys( stringStore[ 'store' ] ) ).toHaveLength( 2 );
		expect( stringStore.length() ).toBe( 2 );

		anyStore.add( 'hello', [ 'world ' ] );
		anyStore.set( 'world', true );
		/* eslint dot-notation: "off" */
		expect( Object.keys( anyStore[ 'store' ] ) ).toHaveLength( 2 );
		expect( anyStore.length() ).toBe( 2 );
	} );

	it( 'should get elements', () => {
		anyStore.add( 'hello', [ 'world' ] );
		anyStore.add( 'world', true );
		anyStore.add( 'test', "it's a string" );

		expect( anyStore.get( 'hello' ) ).toHaveLength( 1 );
		expect( anyStore.get( 'world' ) ).toBe( true );
		expect( anyStore.get( 'test' ) ).toBe( "it's a string" );
	} );

	it( 'should set elements and update if exists', () => {
		anyStore.set( 'hello', 'world' );
		expect( anyStore.get( 'hello' ) ).toBe( 'world' );

		anyStore.set( 'hello', 'goodbye' );
		expect( anyStore.get( 'hello' ) ).toBe( 'goodbye' );
	} );

	it( 'should merge objects', () => {
		const aObject = {
			SOME_KEY: 'this is a key',
			OTHER_KEY: 'another',
		};

		anyStore.add( 'hello', 'world' );
		anyStore.merge( aObject );

		/* eslint dot-notation: "off" */
		expect( Object.keys( anyStore[ 'store' ] ) ).toHaveLength( 3 );
		expect( anyStore.length() ).toBe( 3 );

		expect( anyStore.get( 'OTHER_KEY' ) ).toBe( 'another' );
	} );

	it( 'should fail to add elements that already exists', () => {
		anyStore.add( 'hello', 'world' );
		expect( () => anyStore.add( 'hello', 'another world' ) ).toThrow( KeyAlreadyExistsError );
	} );

	it( 'should fail to get elements that don\'t exist', () => {
		expect( () => anyStore.get( 'key_that_totally_doesnt_exist' ) ).toThrow( KeyDontExistError );
	} );
} );
