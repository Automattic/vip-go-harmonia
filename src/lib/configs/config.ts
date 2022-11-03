import Store, { KeyDontExistError } from '../stores/store';
import { HarmoniaError } from '../errors';

export class InvalidArgumentsConfig extends HarmoniaError {}

export default abstract class BaseConfig<TYPE> {
	private store: Store<TYPE>;
	private sensitiveKeys: string[];

	public constructor() {
		this.store = new Store<TYPE>();
		this.sensitiveKeys = [];
	}

	public runValidation() {
		try {
			this.validate();
		} catch ( error ) {
			if ( error instanceof KeyDontExistError ) {
				throw new InvalidArgumentsConfig( `Missing mandatory key ${ error.key }` );
			}
			throw error; // Pass the error to be handled elsewhere
		}
	}

	protected validate() {
		return true;
	}

	exists( key: string ): boolean {
		return this.store.exists( key );
	}

	get( key: string ): TYPE {
		return this.store.get( key );
	}

	set( key: string, value: TYPE ) {
		this.store.set( key, value );
	}

	merge( object: { [key: string]: TYPE } ) {
		this.store.merge( object );
	}

	all( redactSensitiveKeys = false ): { [key: string]: TYPE } {
		if ( redactSensitiveKeys ) {
			const allowed = Object.entries( this.store.all() ).reduce( ( acc, [ key, value ] ) => {
				// eslint-disable-next-line security/detect-object-injection
				acc[ key ] = this.sensitiveKeys.includes( key ) ? this.redact( key, value ) : value;
				return acc;
			}, [] );
			return Object.assign( {}, allowed ) as unknown as { [key: string]: TYPE };
		}
		return this.store.all();
	}

	protected addSensitiveKey( key: string ) {
		this.sensitiveKeys.push( key );
	}

	protected setSensitiveKeys( keys: string[] ) {
		this.sensitiveKeys = keys;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected redact( key, value ) {
		return '### REDACTED ###';
	}
}
