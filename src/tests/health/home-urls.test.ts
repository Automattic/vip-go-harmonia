import BaseHealthTest from './base.test';
import fetchWithTiming, { HarmoniaFetchError, TimedResponse } from '../../utils/http';
import { extractUrls } from '../../utils/url';
import Issue from '../../lib/issue';
import chalk from 'chalk';

export default class HomeURLsTest extends BaseHealthTest {
	protected paths: string[] = [];

	constructor() {
		super( 'Home page',
			'Checks the responsiveness of the home page and linked pages' );
	}

	async prepare() {
		await super.prepare();

		// Get all the homepage URLs
		this.paths = await this.getHomepagePaths();

		if ( ! this.paths || this.paths?.length === 0 ) {
			this.skip( 'No URLs available for testing' );
		}
	}

	async getHomepagePaths( limit = 10 ): Promise<string[]> {
		try {
			// Get random URLs from homepage
			const homepageRequest = await fetchWithTiming( this.baseURL );

			const isGoodResponse = homepageRequest.response.status === 200 || ( homepageRequest.response.status >= 300 && homepageRequest.response.status <= 399 );
			if ( ! isGoodResponse ) {
				this.warning( 'Error getting URLs from homepage. ' +
					`${ chalk.yellow( homepageRequest.response.status + ' - ' + homepageRequest.response.statusText ) } ` +
					`response from ${ chalk.bold( this.baseURL ) }` );
				return [];
			}

			const homepageContent = await homepageRequest.response.text();

			const allURLs = this.filterPaths( Array.from( extractUrls( homepageContent ) ) );
			return allURLs.slice( 0, limit );
		} catch ( error ) {
			if ( error instanceof HarmoniaFetchError ) {
				throw this.blocker( `Error fetching ${ this.baseURL }: ${ ( error as HarmoniaFetchError ).message }` );
			}
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
