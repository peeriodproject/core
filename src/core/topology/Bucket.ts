import BucketInterface = require('./interfaces/BucketInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('./interfaces/ContactNodeListInterface');
import IdInterface = require('./interfaces/IdInterface');

/**
 * @class core.topology.Bucket
 * @implements core.topology.BucketInterface
 */
class Bucket implements BucketInterface {

	/**
	 * The internally used config object instance
	 *
	 * @member {core.config.ConfigInterface} core.topology.Bucket~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The internally used bucket store instance
	 *
	 * @member {core.topology.BucketStoreInterface} core.topology.Bucket~_store
	 */
	private _store:BucketStoreInterface = null;

	/**
	 * The Key of the bucket
	 *
	 * @member {string} core.topology.Bucket~_key
	 */
	private _key:number = -1;

	/**
	 * The key of the bucket as string
	 *
	 * @member {string} core.topology.Bucket~_keyString
	 */
	private _keyString:string = '';

	constructor (config:ConfigInterface, key:number, store:BucketStoreInterface, onOpenCallback?:(err:Error) => any) {
		var internalOpenCallback = onOpenCallback || function (err:Error) {};

		this._config = config;
		this._key = key;
		this._keyString = this._key.toString();
		this._store = store;

		this.open(internalOpenCallback);
	}

	public add (contact:ContactNodeInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._store.add(
			this._keyString,
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
		callback(null, this._store.contains(this._keyString, contact.getId().getBuffer()));
	}

	public get (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		callback(null, this._store.get(this._keyString, id.getBuffer()));
	}

	getAll (callback:(err:Error, contacts:ContactNodeListInterface) => any):void {
		callback(null, this._store.getAll(this._keyString));
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

		this._store.remove(this._keyString, id.getBuffer());
		internalCallback(null);
	}

	public size (callback:(err:Error, size:number) => any):void {
		callback(null, this._store.size(this._keyString));
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