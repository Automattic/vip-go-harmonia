/**
 * Extract Web URLs from a blob of HTML. We are not looking for completeness
 * here, it's ok if we miss a few edge cases. We just want to pull some URLs
 * from HTML so that we can test them.
 */
export function extractUrls( html: string ): string[] {
	/* eslint-disable security/detect-unsafe-regex */
	const justOkWebUrlPattern =
		/https?:\/\/[-a-zA-Z0-9.]+\.[a-zA-Z]{2,3}(?:\/(?:[^"'<>=]|=)*)?/g;

	return html.match( justOkWebUrlPattern ) || [];
}

/**
 * Determine if a URL is a Web (HTTP/HTTPS) URI.
 */
export function isWebUri( url: string ): boolean {
	try {
		const { protocol } = new URL( url );
		return [ 'http:', 'https:' ].includes( protocol ) && url.startsWith( `${ protocol }//` );
	} catch ( err ) {
		return false;
	}
}
