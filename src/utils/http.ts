import fetch, { Response } from 'node-fetch';

export interface TimedResponse {
	response: Response;
	duration: number; // Duration of the request in ms
}

export default async function fetchWithTiming( url, options? ): Promise<TimedResponse> {
	// Store the start time. hrtime is not subject to clock drift
	const startTime = process.hrtime();
	const response = await fetch( url, options );
	// Divide by a million to get from ns to ms
	const elaspedTime = process.hrtime( startTime )[ 1 ] / 1000000;

	return {
		response: response,
		duration: Math.round( elaspedTime ),
	};
}
