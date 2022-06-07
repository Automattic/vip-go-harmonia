import chalk from 'chalk';

import Test from '../../lib/tests/test';
import { executeShell } from '../../utils/shell';
import fetchWithTiming, { HarmoniaFetchError } from '../../utils/http';

const CACHE_HEALTHCHECK_ROUTE = '/cache-healthcheck?';

/**
 * Maximum desired duration of a cache-healthcheck request, in ms.
 */
const CACHE_HEALTHCHECK_MAX_DESIRED_DURATION = 100;
/**
 * Maximum allowed duration of a cache-healthcheck request, in ms.
 */
const CACHE_HEALTHCHECK_MAX_ALLOWED_DURATION = 200;

export default class HealthcheckTest extends Test {
	private port: number = 0;
	private imageTag: string = '';
	private containerName: string = '';

	private startDate: string = '';

	private cacheHealthcheckDoc = 'https://docs.wpvip.com/technical-references/node-js/#h-requirement-1-exposing-a-health-check-endpoint';

	constructor() {
		super( 'Testing application availability and health-check endpoint',
			'Checking if your app accepts a PORT and responds to /cache-healthcheck' );
	}

	async prepare() {
		// Get required variables
		this.port = this.getEnvVar( 'PORT' ) as number;

		// Get the docker container name
		this.containerName = this.get( 'containerName' );

		// Store the start date
		this.startDate = new Date().toISOString();
	}

	async run() {
		const cacheURL = `http://localhost:${ this.port }${ CACHE_HEALTHCHECK_ROUTE }`;
		this.notice( `Sending a GET request to ${ chalk.yellow( cacheURL ) }...` );

		let request;
		try {
			request = await fetchWithTiming( cacheURL );
		} catch ( error ) {
			this.blocker( `Error fetching ${ cacheURL }: ${ ( error as HarmoniaFetchError ).message }` );
			return;
		}

		const response = request.response;
		this.notice( `Got a ${ chalk.bgWhite.black.bold( response.status ) } response in ${ request.duration }ms` );

		// Get the logs

		let logs;
		try {
			const subprocess = await executeShell( `docker logs ${ this.containerName } --since ${ this.startDate }` );
			logs = subprocess.all;
		} catch ( err ) {
			this.log( 'Error getting docker logs: ' + ( err as Error ).message );
		}

		const isGoodResponse = response.status === 200 || ( response.status >= 300 && response.status <= 399 );

		if ( ! isGoodResponse ) {
			this.blocker( `Could not get a ${ chalk.yellow( '200 - OK' ) } response from ${ chalk.bold( CACHE_HEALTHCHECK_ROUTE ) }.\n` +
				`Make sure your application accepts a ${ chalk.yellow( 'PORT' ) } environment variable.`, this.cacheHealthcheckDoc,
			{ all: logs } );
			return;
		}

		if ( request.duration > CACHE_HEALTHCHECK_MAX_ALLOWED_DURATION ) {
			this.error( `The request to ${ chalk.bold( CACHE_HEALTHCHECK_ROUTE ) } took longer than ` +
				`${ chalk.bold( CACHE_HEALTHCHECK_MAX_ALLOWED_DURATION + 'ms' ) } (${ chalk.yellow( request.duration + 'ms' ) }).\n` +
				'This request is taking too long and it might be a symptom of performance issues with your application.',
			undefined, { all: logs } );
			return;
		}

		if ( request.duration > CACHE_HEALTHCHECK_MAX_DESIRED_DURATION ) {
			this.warning( `The request to ${ chalk.bold( CACHE_HEALTHCHECK_ROUTE ) } took longer than ` +
				`${ chalk.bold( CACHE_HEALTHCHECK_MAX_DESIRED_DURATION + 'ms' ) } (${ chalk.yellow( request.duration + 'ms' ) })` );
			return;
		}
	}
}
