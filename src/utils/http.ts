import fetch, { FetchError, Response } from 'node-fetch';
import { HarmoniaError } from '../lib/errors';

export interface TimedResponse {
	url: string;
	response: Response;
	startDate: Date;
	duration: number; // Duration of the request in ms
}

export class HarmoniaFetchError extends HarmoniaError {
	public startDate;
	public endDate = new Date();
	public url;
	public constructor( error: FetchError ) {
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
	public setURL( url ) {
		this.url = url;
	}
	public getURL() {
		return this.url;
	}
}

export default async function fetchWithTiming( url, options? ): Promise<TimedResponse> {
	// Store the start time. hrtime is not subject to clock drift
	const startTime = process.hrtime();
	const startDate = new Date();
	let response;
	try {
		response = await fetch( url, options );
	} catch ( error ) {
		if ( error instanceof FetchError ) {
			const harmoniaError: HarmoniaFetchError = new HarmoniaFetchError( error );
			harmoniaError.setStartDate( startDate );
			harmoniaError.setURL( url );
			throw harmoniaError;
		}
		throw error;
	}

	// Divide by a million to get from ns to ms
	const endTime = process.hrtime( startTime );
	const elaspedTime = endTime[ 0 ] * 1000 + endTime[ 1 ] / 1000000;

	return {
		url: url,
		response: response,
		startDate: startDate,
		duration: Math.round( elaspedTime ),
	};
}
