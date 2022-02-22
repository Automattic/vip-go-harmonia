import chalk from 'chalk';

import Test from '../../lib/tests/test';
import { executeShell } from '../../utils/shell';
import fetchWithTiming, { HarmoniaFetchError, TimedResponse } from '../../utils/http';
import Issue from '../../lib/issue';

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

	protected constructor( name, description ) {
		super( name, description );
	}

	async prepare() {
		// Get required variables
		this.port = this.getEnvVar( 'PORT' ) as number;
		this.baseURL = this.getSiteOptions().getLocalURL();

		// Get the docker container name
		this.containerName = this.get( 'containerName' );
	}

	async run() {
		for ( const path of this.paths ) {
			const url = this.baseURL + path;
			try {
				await this.request( url );
			} catch ( error ) {
				if ( error instanceof HarmoniaFetchError ) {
					// Get logs
					const subprocess = await executeShell( `docker logs ${ this.containerName } --since ${ error.getStartDate().toISOString() }` );
					const logs = subprocess.all;

					this.blocker( `Error fetching ${ url }: ${ error.message }`, undefined, { all: logs } );
				}
			}
		}
	}

	async request( url ) {
		const request = await fetchWithTiming( url );
		await this.handleRequest( request );
	}

	async handleRequest( request: TimedResponse ): Promise<Issue> {
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
