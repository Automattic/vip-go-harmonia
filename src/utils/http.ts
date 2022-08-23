import fetch, { FetchError, Response } from 'node-fetch';
import { HarmoniaError } from '../lib/errors';

export interface TimedResponse {
	url: string;
	response: Response;
	startDate: Date;
	duration: number; // Duration of the request in ms
}

export class HarmoniaFetchError extends HarmoniaError {
	public startDate = new Date();
	public endDate = new Date();
	public url = '';
	public timeout = false;

	public constructor( error: Error ) {
		super();
		Object.assign( this, error );
	}
	public setStartDate( date: Date ) {
		this.startDate = date;
	}
	public getStartDate(): Date {
		return this.startDate;
	}
	public setEndDate( date: Date ) {
		this.endDate = date;
	}
	public getEndDate(): Date {
		return this.endDate;
	}
	public setURL( url: string ) {
		this.url = url;
	}
	public getURL(): string {
		return this.url;
	}
	public flagAsTimeout() {
		this.timeout = true;
	}
}

async function fetchWithTimeout( url, options: any = {} ) {
	const { timeout = 10000 } = options;

	const controller = new AbortController();
	const id = setTimeout( () => controller.abort(), timeout );

	const response = await fetch( url, {
		...options,
		signal: controller.signal,
		redirect: 'manual',
		follow: 0,
	} );
	clearTimeout( id );

	return response;
}

export default async function fetchWithTiming( url, options? ): Promise<TimedResponse> {
	// Store the start time. hrtime is not subject to clock drift
	const startTime = process.hrtime();
	const startDate = new Date();
	let response;
	try {
		response = await fetchWithTimeout( url, options );
	} catch ( error ) {
		if ( error instanceof FetchError ) {
			const harmoniaError: HarmoniaFetchError = new HarmoniaFetchError( error );
			harmoniaError.setStartDate( startDate );
			harmoniaError.setURL( url );
			throw harmoniaError;
		}

		// If timeout
		if ( ( error as Error ).name === 'AbortError' ) {
			const harmoniaError: HarmoniaFetchError = new HarmoniaFetchError( error as Error );
			harmoniaError.setStartDate( startDate );
			harmoniaError.setURL( url );
			harmoniaError.flagAsTimeout();
			throw harmoniaError;
		}

		throw error;
	}

	// Divide by a million to get from ns to ms
	const endTime = process.hrtime( startTime );
	const elaspedTime = ( endTime[ 0 ] * 1000 ) + ( endTime[ 1 ] / 1000000 );

	return {
		url,
		response,
		startDate,
		duration: Math.round( elaspedTime ),
	};
}
