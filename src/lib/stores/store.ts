export class KeyDontExistError extends Error {}
export class KeyAlreadyExistsError extends Error {}

export default class Store<TYPE=any> {
	private store: { [key: string]: TYPE };

	constructor() {
		this.store = {};
	}

	/**
	 * Validates if a given key exists in the store
	 * @param key
	 */
	exists( key: string ) {
		return key in this.store;
	}

	/**
	 * Add a new key-value to the store. If it exists, throw an Exception
	 * @param key
	 * @param value
	 */
	add( key: string, value: TYPE ) {
		if ( this.exists( key ) ) {
			throw new KeyAlreadyExistsError;
		}

		this.set( key, value );
	}

	/**
	 * Retrieves a value for a given key.
	 * @param key
	 */
	get( key: string ) {
		if ( ! this.exists( key ) ) {
			throw new KeyDontExistError;
		}

		return this.store[ key ];
	}

	/**
	 * Sets a key to a given value. If the key already exists, will update it. Otherwise, the key-value pair will be
	 * created.
	 * @param key
	 * @param value
	 */
	set( key: string, value: TYPE ) {
		this.store[ key ] = value;
	}

	/**
	 * Merge a existing object to the current store
	 * @param object
	 */
	merge( object: { [key: string]: TYPE } ) {
		this.store = { ...( this.store ), ...object };
	}

	length() {
		return Object.keys( this.store ).length;
	}

	toString() {
		return JSON.stringify( this.store );
	}
}