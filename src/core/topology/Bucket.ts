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

	constructor (config:ConfigInterface, key:string, store:BucketStoreInterface, onOpenCallback?:(err:Error) => any) {
		var internalOpenCallback = onOpenCallback || function (err:Error) {};

		this._config = config;
		this._key = key;
		this._store = store;

		this.open(internalOpenCallback);
	}

	public add (contact:ContactNodeInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._store.add(
			this._key,
			contact.getId().getBuffer(),
			contact.getLastSeen(),
			contact.getAddresses()
		);

		internalCallback(null);
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._store.close();
		internalCallback(null);
	}

	public contains (contact:ContactNodeInterface, callback:(err:Error, contains:boolean) => any):void {
		callback(null, this._store.contains(this._key, contact.getId().getBuffer()));
	}

	public get (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		callback(null, this._store.get(this._key, id.getBuffer()));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		callback(null, this._store.isOpen());
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._store.open();
		internalCallback(null);
	}

	public remove (id:IdInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._store.remove(this._key, id.getBuffer());
		internalCallback(null);
	}

	public size (callback:(err:Error, size:number) => any):void {
		callback(null, this._store.size(this._key));
	}

	public update (contact:ContactNodeInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};
		var removed:boolean;
		var added:boolean;
		var error:Error;

		var updatedCallback = function () {
			if (error) {
				internalCallback(error);
			}
			else if (removed && added) {
				internalCallback(null);
			}

		};

		// todo Benchmark: always replace vs. check nodeaddresses and update
		this.remove(contact.getId(), function (err:Error) {
			if (callback) {
				if (err) {
					error = err;
				}
				else {
					removed = true;
				}

				updatedCallback();
			}
		});

		this.add(contact, function (err:Error) {
			if (callback) {
				if (err) {
					error = err;
				}
				else {
					added = true;
				}

				updatedCallback();
			}
		});
	}

}

export = Bucket;