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
			throw harmoniaError;
		}
		throw error;
	}

	// Divide by a million to get from ns to ms
	const elaspedTime = process.hrtime( startTime )[ 1 ] / 1000000;

	return {
		url: url,
		response: response,
		startDate: startDate,
		duration: Math.round( elaspedTime ),
	};
}
