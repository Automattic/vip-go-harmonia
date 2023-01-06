import { extractUrls, isWebUri } from '../../src/utils/url';

describe( 'utils/url', () => {
	describe( 'extractUrls', () => {
		const testHtml = `
			This is a story about <code>http://google.com</code>. It was a handy web site
			that let you <a href="https://google.com/?s=kittens">search the internet</a>.
			Then even though nobody asked it to, it started doing other "cool" stuff like
			<a href='https://mail.google.com/#inbox'>email</a> and http://maps.google.com.

			Why? No one knows. Then it started selling <ads|https://adwords.google.com/welcome>
			and it really went downhill from there.

			Moral: Don't be evil.
		`;

		it( 'extracts URLs from HTML and HTML-like markup', () => {
			expect( extractUrls( testHtml ) ).toEqual( [
				'http://google.com',
				'https://google.com/?s=kittens',
				'https://mail.google.com/#inbox',
				'http://maps.google.com',
				'https://adwords.google.com/welcome',
			] );
		} );
	} );

	describe( 'isWebUri', () => {
		// Test cases copied from the libraries we want to avoid.
		// https://github.com/ogt/valid-url/blob/master/test/is_web_uri.js

		it( 'returns true for valid web URIs', () => {
			const testCases = [
				'https://www.richardsonnen.com/',
				'https://www.richardsonnen.com',
				'https://www.richardsonnen.com/foo/bar/test.html',
				'https://www.richardsonnen.com/?foo=bar',
				'https://www.richardsonnen.com:8080/test.html',
				'http://www.richardsonnen.com/',
				'http://www.richardsonnen.com',
				'http://www.richardsonnen.com/foo/bar/test.html',
				'http://www.richardsonnen.com/?foo=bar',
				'http://www.richardsonnen.com:8080/test.html',
				'http://example.w3.org/path%20with%20spaces.html',
				'http://192.168.0.1/',
			];

			testCases.forEach( testCase => {
				expect( isWebUri( testCase ) ).toBe( true );
			} );
		} );

		it( 'returns false for valid web URIs', () => {
			const testCases = [
				'',
				'ftp://ftp.richardsonnen.com',
				'https:www.richardsonnen.com',
				'http:www.richardsonnen.com',
			];

			testCases.forEach( testCase => {
				expect( isWebUri( testCase ) ).toBe( false );
			} );
		} );
	} );
} );

