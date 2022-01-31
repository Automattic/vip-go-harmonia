import Store from '../stores/store';

export default abstract class BaseConfig<TYPE> {
	private store: Store<TYPE>;

	protected constructor() {
		this.store = new Store<TYPE>();
	}

	get( key: string ) {
		this.store.get( key );
	}

	set( key: string, value: TYPE ) {
		this.store.set( key, value );
	}

	merge( object: { [key: string]: TYPE } ) {
		this.store.merge( object );
	}
}
