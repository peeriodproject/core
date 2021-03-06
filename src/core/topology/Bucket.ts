import BucketInterface = require('./interfaces/BucketInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeObjectInterface = require('./interfaces/ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('./interfaces/ContactNodeObjectListInterface');
import ContactNodeListInterface = require('./interfaces/ContactNodeListInterface');
import IdInterface = require('./interfaces/IdInterface');

/**
 * @class core.topology.Bucket
 * @implements core.topology.BucketInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {number} key
 * @param {number} maxBucketSize
 * @param {core.topology.BucketStoreInterface} store
 * @param {core.topology.ContactNodeFactoryInterface} contactNodeFactory
 * @param {Function} onOpenCallback
 */
class Bucket implements BucketInterface {

	/**
	 * The internally used config object instance
	 *
	 * @member {core.config.ConfigInterface} core.topology.Bucket~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The internally used contact node factory instance
	 *
	 * @member {core.topology.ContactNodeFactoryInterface} core.topology.Bucket~_contactNodeFactory
	 */
	private _contactNodeFactory:ContactNodeFactoryInterface = null;

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

	/**
	 * The maximum amount of contact nodes the bucket should handle.
	 *
	 * @member {string} core.topology.Bucket~_maxBucketSize
	 */
	private _maxBucketSize:number = -1;

	constructor (config:ConfigInterface, key:number, maxBucketSize:number, store:BucketStoreInterface, contactNodeFactory:ContactNodeFactoryInterface, onOpenCallback?:(err:Error) => any) {
		var internalOpenCallback = onOpenCallback || function (err:Error) {
		};

		this._config = config;
		this._key = key;
		this._maxBucketSize = maxBucketSize;
		this._store = store;
		this._contactNodeFactory = contactNodeFactory;
		this._keyString = this._key.toString();

		this.open(internalOpenCallback);
	}

	public add (contact:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error, longestNotSeenContact:ContactNodeInterface) {
		};

		if (this._store.size(this._keyString) < this._maxBucketSize) {
			this._store.add(
				this._keyString,
				contact.getId().getBuffer(),
				contact.getLastSeen(),
				contact.getAddresses()
			);

			return process.nextTick(internalCallback.bind(null, null, null));
		}
		else {
			this.getLongestNotSeen(function (err:Error, contact:ContactNodeInterface) {
				internalCallback(new Error('Bucket.add: Cannot add another contact. The Bucket is already full.'), contact);
			});
		}
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._store.close();

		return process.nextTick(internalCallback.bind(null, null));
	}

	public contains (contact:ContactNodeInterface, callback:(err:Error, contains:boolean) => any):void {
		return process.nextTick(function () {
			callback(null, this._store.contains(this._keyString, contact.getId().getBuffer()));
		}.bind(this));
	}

	public get (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void {
		var contact:ContactNodeInterface = this._convertToContactNodeInstance(this._store.get(this._keyString, id.getBuffer()));

		return process.nextTick(callback.bind(null, null, contact));

	}

	public getAll (callback:(err:Error, contacts:ContactNodeListInterface) => any):void {
		var storedObjects:ContactNodeObjectListInterface = this._store.getAll(this._keyString);
		var contacts:ContactNodeListInterface = [];

		if (storedObjects && storedObjects.length) {
			for (var i = 0, l = storedObjects.length; i < l; i++) {
				contacts.push(this._convertToContactNodeInstance(storedObjects[i]));
			}
		}

		return process.nextTick(callback.bind(null, null, contacts.slice()));
	}

	public getLongestNotSeen (callback:(err:Error, contact:ContactNodeInterface) => any):void {
		var contact:ContactNodeInterface = this._convertToContactNodeInstance(this._store.getLongestNotSeen(this._keyString));

		return process.nextTick(callback.bind(null, null, contact));
	}

	public getRandom (callback:(err:Error, contact:ContactNodeInterface) => any):void {
		var contact:ContactNodeInterface = this._convertToContactNodeInstance(this._store.getRandom(this._keyString));

		return process.nextTick(callback.bind(null, null, contact));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._store.isOpen()));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._store.open();
		return process.nextTick(internalCallback.bind(null, null));
	}

	public remove (id:IdInterface, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._store.remove(this._keyString, id.getBuffer());

		return process.nextTick(internalCallback.bind(null, null));
	}

	public size (callback:(err:Error, size:number) => any):void {
		return process.nextTick(callback.bind(null, null, this._store.size(this._keyString)));
	}

	public update (contact:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void {
		var internalCallback = callback || function (err:Error, longestNotSeenContact:ContactNodeInterface) {
		};
		var removed:boolean;
		var added:boolean;
		var error:Error;
		var longestNotSeenContact:ContactNodeInterface;
		var thrown = false;

		var updatedCallback = function () {
			if (error) {
				if (!thrown) {
					thrown = true;
					return internalCallback(error, longestNotSeenContact);
				}
			}
			else if (removed && added) {
				return internalCallback(null, null);
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

				return updatedCallback();
			}
		});

		this.add(contact, function (err:Error, contact:ContactNodeInterface) {
			if (callback) {
				if (err) {
					error = err;
					longestNotSeenContact = contact;
				}
				else {
					added = true;
				}

				return updatedCallback();
			}
		});
	}

	/**
	 * Converts a {@link core.topology.ContactNodeObjectInterface} into a {@link core.topology.ContactNodeInterface}
	 * by using the {@link core.topology.Bucket~_contactNodeFactory} passed in at construction.
	 *
	 * @method core.topology.Bucket~_convertToContactNodeInstance
	 *
	 * @param {core.topology.ContactNodeObjectInterface} contactObject
	 * @returns {core.topology.ContactNodeInterface}
	 */
	private _convertToContactNodeInstance (contactObject:ContactNodeObjectInterface):ContactNodeInterface {
		return contactObject ? this._contactNodeFactory.createFromObject(contactObject) : null;
	}

}

export = Bucket;