import fetch, { Response } from 'node-fetch';
import { createHash } from 'crypto';
import snakeCase from 'lodash.snakecase';

const debug = require( 'debug' )( 'analytics' );
const validEventOrPropNamePattern = /^[a-z_][a-z0-9_]*$/;

class Analytics {
	private static instance: Analytics;

	private eventPrefix: string;
	private userAgent: string = 'vip-harmonia-cli';

	private commonProps: {
		_ui: string,
		_ut: string,
		// eslint-disable-next-line camelcase
		_via_ua: string,
	};
	private baseParams: {} = {};
	private readonly ENDPOINT = 'https://public-api.wordpress.com/rest/v1.1/tracks/record?http_envelope=1';

	private constructor( eventPrefix ) {
		this.eventPrefix = eventPrefix;

		this.commonProps = {
			_ui: '0', // TODO: replace with the user id, if running from CLI
			_ut: 'anon', // TODO: replace with user type
			_via_ua: this.userAgent,
		};
	}

	setUser( userId: string, userType: string ) {
		this.commonProps._ui = userId;
		this.commonProps._ut = userType;
	}

	setBaseParams( params: {} ) {
		Object.keys( params ).forEach( param => {
			const sanitizedParam = this.sanitizeName( param );

			if ( ! [ 'number', 'boolean', 'string' ].includes( typeof params[ param ] ) ) {
				return delete params[ param ];
			}

			if ( validEventOrPropNamePattern.test( sanitizedParam ) &&
				sanitizedParam !== param ) {
				params[ sanitizedParam ] = params[ param ];
				return delete params[ param ];
			}
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
		const props = this.baseParams;
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

		const tracksEvents = {
			commonProps: this.commonProps,
			events: [ {
				_en: name,
				...props,
			} ],
		};

		debug( 'trackEvent()', tracksEvents );

		try {
			return await this.send( tracksEvents );
		} catch ( error ) {
			debug( error );
		}

		// Resolve to false instead of rejecting
		return Promise.resolve( false );
	}

	async send( params: {} ): Promise<any> {
		if ( process.env.DO_NOT_TRACK ) {
			debug( 'send() => skipping per DO_NOT_TRACK variable' );

			return Promise.resolve( 'tracks disabled per DO_NOT_TRACK variable' );
		}

		const method = 'POST';
		const body = JSON.stringify( params );
		const headers = {
			'Accept-Encoding': 'gzip, deflate',
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent': this.userAgent,
		};

		const bodyUniqueString = createHash( 'md5' ).update( body ).digest( 'hex' );
		debug( `send() (${ bodyUniqueString }) `, body );

		// eslint-disable-next-line no-undef
		const response = await fetch( this.ENDPOINT, {
			method,
			body,
			headers,
		} );
		const responseBody = await response.text();

		debug( `response (${ bodyUniqueString }) `, responseBody );
	}
}

export async function trackEvent( name: string, props = {} ) {
	const analytics = Analytics.getInstance();
	return await analytics.trackEvent( name, props );
}

export function setUser( userId, userType ) {
	const analytics = Analytics.getInstance();
	analytics.setUser( userId, userType );
}

export function setBaseParams( params ) {
	const analytics = Analytics.getInstance();
	analytics.setBaseParams( params );
}
