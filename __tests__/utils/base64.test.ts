import { isBase64 } from '../../src/utils/base64';

describe( 'utils/base64', () => {
	const string = 'This is an example!';

	it( 'should be true for a base64 encoded string', () => {
		const encodedString = Buffer.from( string ).toString( 'base64' );

		expect( isBase64( encodedString ) ).toBeTruthy();
		expect( isBase64( string ) ).toBeFalsy();
	} );

	it( 'should be false for invalid base64 strings', () => {
		const encodedString = Buffer.from( string ).toString( 'base64' );

		// Remove last couple chars to make it definitely invalid
		const badEncodedString = encodedString.slice( 0, -2 );

		expect( isBase64( badEncodedString ) ).toBeFalsy();
		expect( isBase64( '' ) ).toBeFalsy();
		expect( isBase64( 'hello' ) ).toBeFalsy();
	} );
} );
