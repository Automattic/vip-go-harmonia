/**
 * Tests if a specific string is encoded in base64 format.
 */
export function isBase64( string: string ): boolean {
	if ( string === '' ) {
		return false;
	}

	// Regular expression to detect base64 strings
	const regex = '(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+/]{3}=)?';

	return ( new RegExp( '^' + regex + '$', 'gi' ) ).test( string );
}

