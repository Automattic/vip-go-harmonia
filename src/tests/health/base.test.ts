import chalk from 'chalk';

import Test from '../../lib/tests/test';
import { executeShell } from '../../utils/shell';
import fetchWithTiming, { HarmoniaFetchError, TimedResponse } from '../../utils/http';
import Issue from '../../lib/issue';
import { isWebUri } from 'valid-url';

/**
 * Maximum desired duration of a cache-healthcheck request, in ms.
 */
const REQUEST_MAX_DESIRED_DURATION = 1000;
/**
 * Maximum allowed duration of a cache-healthcheck request, in ms.
 */
const REQUEST_MAX_ALLOWED_DURATION = 2000;

export default abstract class BaseHealthTest extends Test {
	private port: number = 0;
	private containerName: string = '';

	protected baseURL: string = '';
	protected paths: string[] = []
	protected publicURL: string = '';

	protected constructor( name, description ) {
		super( name, description );
	}

	async prepare() {
		// Get required variables
		this.port = this.getEnvVar( 'PORT' ) as number;
		this.baseURL = this.getSiteOptions().getLocalURL();

		// Get public URL for search-replace with the local URL
		this.publicURL = this.getSiteOptions().getPublicURL();

		// Get the docker container name
		this.containerName = this.get( 'containerName' );
	}

	async run() {
		const promises: Promise<any>[] = [];

		// Do the request to the paths asynchronously
		for ( const path of this.paths ) {
			const url = isWebUri( path ) ? path : this.baseURL + path;
			promises.push( this.request( url ) );
		}

		try {
			await Promise.all( promises );
		} catch ( error ) {
			if ( error instanceof HarmoniaFetchError ) {
				// Get logs
				const subprocess = await executeShell( `docker logs ${ this.containerName } --since ${ error.getStartDate().toISOString() } ` +
					`--until ${ error.getEndDate().toISOString() }` );
				const logs = subprocess.all;

				this.blocker( `Error fetching ${ error.getURL() }: ${ error.message }`, undefined, { all: logs } );
			}
			console.log( error );
		}
	}

	/**
	 * Given an array of URLs, filter the URLs that are starting either with the local or the public URL,
	 * and does a search-replace, converting full URLs into paths.
	 * @param urls
	 * @protected
	 */
	protected filterPaths( urls: string[] ): string[] {
		return urls
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
	}

	/**
	 * Performs and handles a request
	 * @param url
	 * @protected
	 */
	protected async request( url ) {
		const request = await fetchWithTiming( url );
		await this.handleRequest( request );
	}

	/**
	 * Handles a request, and returns the resulting issue.
	 * @param request
	 * @protected
	 * @return Issue
	 */
	protected async handleRequest( request: TimedResponse ): Promise<Issue> {
		// Check for logs
		const subprocess = await executeShell( `docker logs ${ this.containerName } --since ${ request.startDate.toISOString() }` );
		const logs = subprocess.all;

		if ( request.response.status !== 200 ) {
			return this.error( `Could not get a ${ chalk.yellow( '200 - OK' ) } response from ${ chalk.bold( request.url ) }.\n`,
				undefined, { all: logs } );
		}

		if ( request.duration > REQUEST_MAX_ALLOWED_DURATION ) {
			return this.error( `The request to ${ chalk.bold( request.url ) } took longer than ` +
				`${ chalk.bold( REQUEST_MAX_ALLOWED_DURATION + 'ms' ) } (${ chalk.yellow( request.duration + 'ms' ) }).\n` +
				'This request is taking too long and it might be a symptom of performance issues with your application.',
			undefined, { all: logs } );
		}

		if ( request.duration > REQUEST_MAX_DESIRED_DURATION ) {
			return this.warning( `The request to ${ chalk.bold( request.url ) } took longer than ` +
				`${ chalk.bold( REQUEST_MAX_DESIRED_DURATION + 'ms' ) } (${ chalk.yellow( request.duration + 'ms' ) })` );
		}

		return this.notice( `${ chalk.bold( request.url ) } returned ${ chalk.bgWhite.black.bold( request.response.status ) } in ${ request.duration }ms` );
	}
}
