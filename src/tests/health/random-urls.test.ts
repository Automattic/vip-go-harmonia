import fetch from 'node-fetch';
import BaseHealthTest from './base.test';
import getUrls from 'get-urls';
import { TimedResponse } from '../../utils/http';
import Issue from '../../lib/issue';
import chalk from 'chalk';

/**
 * Maximum desired duration of a cache-healthcheck request, in ms.
 */
const REQUEST_MAX_DESIRED_DURATION = 1000;
/**
 * Maximum allowed duration of a cache-healthcheck request, in ms.
 */
const REQUEST_MAX_ALLOWED_DURATION = 2000;

export default class RandomUrlsTest extends BaseHealthTest {
	protected paths: string[] = []

	private publicURL: string = '';

	constructor() {
		super( 'Testing with random URLs',
			'Get a set of random URLs from the sitemap and/or index and check their availability' );
	}

	async prepare() {
		await super.prepare();
		// Get public URL for search-replace with the local URL
		this.publicURL = this.getSiteOptions().getPublicURL();

		// Get all the homepage URLs
		this.paths = await this.getHomepagePaths( );
	}

	async getHomepagePaths( limit = 10 ) {
		try {
			// Get random URLs from homepage
			const homepageRequest = await fetch( this.baseURL );
			const homepageContent = await homepageRequest.text();
			const allURLs = Array.from( getUrls( homepageContent, { extractFromQueryString: true, requireSchemeOrWww: true } ) )
				// Get only URLs that start with either the public or local URL
				.filter( url => url.startsWith( this.publicURL ) || url.startsWith( this.baseURL ) )
				// Search and replace the public URL
				.map( url => {
					let path = url.replace( this.publicURL, '' );
					if ( ! path.startsWith( '/' ) ) {
						path = '/' + path;
					}
					return path;
				} );
			return allURLs.slice( 0, limit );
		} catch ( error ) {
			// TODO
			throw error;
		}
	}

	async handleRequest( request: TimedResponse ): Promise<Issue> {
		if ( request.response.status === 404 ) {
			return this.warning( `${ chalk.bold( request.url ) } responded with a ${ chalk.yellow( '404 - Not Found' ) } in ${ chalk.yellow( request.duration + 'ms' ) }` );
		}

		return super.handleRequest( request );
	}
}
