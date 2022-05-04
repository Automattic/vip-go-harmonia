import { URLSearchParams } from 'url';
import fetch, { Response } from 'node-fetch';
import snakeCase from 'lodash.snakecase';

const debug = require( 'debug' )( 'analytics' );
const validEventOrPropNamePattern = /^[a-z_][a-z0-9_]*$/;

class Analytics {
	private static instance: Analytics;

	private eventPrefix: string;
	private userAgent: string = 'vip-harmonia-cli';

	private baseParams: {};

	private readonly ENDPOINT = 'https://public-api.wordpress.com/rest/v1.1/tracks/record';

	constructor( eventPrefix ) {
		this.eventPrefix = eventPrefix;

		this.baseParams = {
			'commonProps[_ui]': '0', // TODO: replace with the user id, if running from CLI
			'commonProps[_ut]': 'anon', // TODO: replace with user type
			'commonProps[_via_ua]': this.userAgent,
		};
	}

	setUser( userId: string, userType: string ) {
		this.baseParams[ 'commonProps[_ui]' ] = userId;
		this.baseParams[ 'commonProps[_ut]' ] = userType;
	}

	setBaseParams( params: {} ) {
		// Convert the parameters to Tracks valid HTTP parameters
		Object.keys( params ).forEach( param => {
			params[ `events[0][${ param }]` ] = params[ param ];
			delete params[ param ];
		} );

		this.baseParams = { ...this.baseParams, ...params };
	}

	static getInstance(): Analytics {
		if ( ! Analytics.instance ) {
			Analytics.instance = new Analytics( 'vip_harmonia_' );
		}
		return Analytics.instance;
	}

	private sanitizeName( currentName: string ): string {
		currentName = currentName.replace( ':', '_' );
		return snakeCase( currentName );
	}

	async trackEvent( name: string, eventProps = {} ): Promise<Response|boolean|string> {
		if ( ! name.startsWith( this.eventPrefix ) ) {
			name = this.eventPrefix + name;
		}

		if ( ! validEventOrPropNamePattern.test( name ) ) {
			name = this.sanitizeName( name );
			if ( ! validEventOrPropNamePattern.test( name ) ) {
				debug( `Error: Invalid event name detected: ${ name } -- this event will be rejected during ETL` );
			}
		}

		// Create and sanitize event props
		const props = {};
		Object.keys( eventProps ).forEach( propName => {
			if ( validEventOrPropNamePattern.test( propName ) ) {
				props[ propName ] = eventProps[ propName ];
				return;
			}

			const sanitezedPropName = this.sanitizeName( propName );
			if ( validEventOrPropNamePattern.test( sanitezedPropName ) ) {
				props[ sanitezedPropName ] = eventProps [ propName ];
				return;
			}

			debug( `Error: Invalid prop name detected: ${ propName } -- this event will be rejected during ETL` );
		} );

		const event = Object.assign( {
			_en: name,
		}, props );

		// For when we want to support batched events
		const events = [ event ];

		/**
		 * The API expects an indexed events array with event data.
		 *
		 * `querystring.stringify` does not handle nested arrays and objects very well.
		 *
		 * So we can just do it ourselves instead.
		 *
		 * Should end up with something like:
		 *  - events[0][_en]=clickButton // event name
		 *  - events[0][buttonName]=Deploy // event custom prop
		 *  - events[1][_en]=loadPage
		 */
		const params = events.reduce( ( reduced, ev, index ) => {
			Object.keys( ev ).forEach( key => {
				const param = `events[${ index }][${ key }]`;
				reduced[ param ] = event[ key ];
			} );

			return reduced;
		}, {} );

		debug( 'trackEvent()', params );

		try {
			return await this.send( params );
		} catch ( error ) {
			debug( error );
		}

		// Resolve to false instead of rejecting
		return Promise.resolve( false );
	}

	send( extraParams: {} ): Promise<any> {
		if ( process.env.DO_NOT_TRACK ) {
			debug( 'send() => skipping per DO_NOT_TRACK variable' );

			return Promise.resolve( 'tracks disabled per DO_NOT_TRACK variable' );
		}

		const params = Object.assign( {}, this.baseParams, extraParams );

		const method = 'POST';
		const body = new URLSearchParams( params ).toString();
		const headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': this.userAgent,
		};

		debug( 'send()', body );

		// eslint-disable-next-line no-undef
		return fetch( this.ENDPOINT, {
			method,
			body,
			headers,
		} );
	}
}

export async function trackEvent( name: string, props = {} ) {
	const analytics = Analytics.getInstance();
	return analytics.trackEvent( name, props );
}

export function setUser( userId, userType ) {
	const analytics = Analytics.getInstance();
	analytics.setUser( userId, userType );
}

export function setBaseParams( params ) {
	const analytics = Analytics.getInstance();
	analytics.setBaseParams( params );
}
