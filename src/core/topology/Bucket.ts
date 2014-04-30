import BucketInterface = require('./interfaces/BucketInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import IdInterface = require('./interfaces/IdInterface');

/**
 * @class core.topology.Bucket
 * @implements core.topology.BucketInterface
 */
class Bucket implements BucketInterface {

	/**
	 * The internally used config object instance
	 *
	 * @private
	 * @member {core.config.ConfigInterface} core.topology.Bucket#_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The internally used bucket store instance
	 *
	 * @private
	 * @member {core.topology.BucketStoreInterface} core.topology.Bucket#_store
	 */
	private _store:BucketStoreInterface = null;

	/**
	 * The Key of the bucket
	 *
	 * @private
	 * @member {string} core.topology.Bucket#_key
	 */
	private _key:string = '';

	constructor (config:ConfigInterface, key:string, store:BucketStoreInterface) {
		this._config = config;
		this._key = key;
		this._store = store;

		this.open();
	}

	public add (contact:ContactNodeInterface):boolean {
		return this._store.add(
			this._key,
			contact.getId(),
			contact.getLastSeen(),
			contact.getAddresses(),
			contact.getPublicKey()
		);
	}

	public close ():void {
		this._store.close();
	}

	public contains (contact:ContactNodeInterface):boolean {
		return this._store.contains(this._key, contact.getId());
	}

	public get (id:IdInterface):any {
		return this._store.get(this._key, id);
	}

	public isOpen ():boolean {
		return this._store.isOpen();
	}

	public open ():void {
		this._store.open();
	}

	public remove (id:IdInterface):boolean {
		return this._store.remove(this._key, id);
	}

	public size ():number {
		return this._store.size(this._key);
	}

	public update (contact:ContactNodeInterface):boolean {
		if (this.contains(contact)) {
			// todo Benchmark: always replace vs. check nodeaddresses and update
			this.remove(contact.getId());
			this.add(contact);
		}
		else if (this.size() < this._config.get('topology.k')) {
			this.add(contact);
		}
		else {
			// todo ping pong
		}

		return false;
	}

}

export = Bucket;