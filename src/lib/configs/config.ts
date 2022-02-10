import Store, { KeyDontExistError } from '../stores/store';
import { HarmoniaError } from '../errors';

export class InvalidArgumentsConfig extends HarmoniaError {}

export default abstract class BaseConfig<TYPE> {
	private store: Store<TYPE>;

	protected constructor() {
		this.store = new Store<TYPE>();
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

	all(): { [key: string]: TYPE } {
		return this.store.all();
	}
}
