/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/node-lmdb/node-lmdb.d.ts' />

import lmdb = require('node-lmdb');

import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('./interfaces/ContactNodeListInterface');
import ContactNodeObjectInterface = require('./interfaces/ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('./interfaces/ContactNodeObjectListInterface');

/**
 * LMDB-BucketStore Implementation
 *
 * @class core.topology.BucketStore
 * @implements core.topology.BucketStoreInterface
 */
class BucketStore implements BucketStoreInterface {

	/**
	 * The internal lmdb database instance
	 *
	 * @member {lmdb.Dbi} core.topology.BucketStore~_databaseInstance
	 */
	private _databaseInstance:lmdb.Dbi = null;

	/**
	 * The internal lmdb database environment instance
	 *
	 * @member {lmdb.Env} core.topology.BucketStore~_databaseEnvironment
	 */
	private _databaseEnvironment:lmdb.Env = null;

	/**
	 * Indicates wheather the store is open or closed
	 *
	 * @member {boolean} core.topology.BucketStore~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * The name of the internal database
	 *
	 * @member {boolean} core.topology.BucketStore~_name
	 */
	private _name:string = '';

	/**
	 * An absolute path where the database stores it's files
	 *
	 * @member {boolean} core.topology.BucketStore~_path
	 */
	private _path:string = '';

	constructor (name:string, path:string) {
		this._name = name;
		this._path = path;

		this.open();
	}

	public add (bucketKey:string, id:Buffer, lastSeen:number, addresses:any):boolean {
		var txn:lmdb.Txn = this._beginTransaction();
		var added:boolean = this._add(txn, bucketKey, id, lastSeen, addresses);

		txn.commit();

		return added;
	}

	// todo remove depencency to ContactNodeInterface and use keyed objects instead
	public addAll (bucketKey:string, contacts:ContactNodeListInterface):boolean {
		var txn:lmdb.Txn = this._beginTransaction();
		var added:boolean = false;

		for (var i = 0, l = contacts.length; i < l; i++) {
			var contact:ContactNodeInterface = contacts[i];

			added = this._add(txn, bucketKey, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		}

		txn.commit();

		return added;
	}

	public close ():void {
		if (!this._isOpen) {
			return;
		}

		this._isOpen = false;

		this._databaseInstance.close();
		this._databaseInstance = null;

		this._databaseEnvironment.close();
		this._databaseEnvironment = null;
	}

	public contains (bucketKey:string, id:Buffer):boolean {
		return (this.get(bucketKey, id) !== null);
	}

	public get (bucketKey:string, id:Buffer):ContactNodeObjectInterface {
		var txn:lmdb.Txn = this._beginReadOnlyTransaction();
		var cursor:lmdb.Cursor = this._getCursor(txn);
		var value:any = this._get(txn, id);

		cursor.close();
		txn.commit();

		return value;
	}

	public getAll (bucketKey:string):ContactNodeObjectListInterface {
		var txn:lmdb.Txn = this._beginReadOnlyTransaction();
		var cursor:lmdb.Cursor = this._getCursor(txn);
		var bucketKeyShortcut = this._getBucketKey(bucketKey);
		var values:ContactNodeObjectListInterface = [];

		// Go the the first occourence of `bucketKey` and iterate from there
		for (var found = cursor.goToRange(bucketKeyShortcut); found; found = cursor.goToNext()) {
			// Stop the loop if the current key is no longer part of the bucket
			if (found.indexOf(bucketKeyShortcut) !== 0) {
				break;
			}

			cursor.getCurrentBinary((key, idBuffer) => {
				var contact = this._get(txn, idBuffer);
				values.push(contact);
			});
		}

		cursor.close();
		txn.commit();

		return values;
	}

	public getLongestNotSeen (bucketKey:string):ContactNodeObjectInterface {
		var txn:lmdb.Txn = this._beginReadOnlyTransaction();
		var cursor:lmdb.Cursor = this._getCursor(txn);
		var bucketKeyShortcut = this._getBucketKey(bucketKey);
		var lastSeenId:Buffer = null;
		var contact:ContactNodeObjectInterface = null;

		var found = cursor.goToRange(bucketKeyShortcut);

		if (found.indexOf(bucketKeyShortcut) === 0) {
			cursor.getCurrentBinary((key, idBuffer) => {
				lastSeenId = idBuffer;
			});

			contact = this._get(txn, lastSeenId);
		}

		cursor.close();
		txn.commit();

		return contact;
	}

	public getRandom (bucketKey:string):ContactNodeObjectInterface {
		var all:ContactNodeObjectListInterface = this.getAll(bucketKey);
		var randomIndex:number = Math.round(Math.random() * (all.length - 1));

		return randomIndex > -1 ? all[randomIndex] : null;
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		if (this._isOpen) return;

		this._databaseEnvironment = new lmdb.Env();
		this._databaseEnvironment.open({
			//name: this._name,
			path: this._path
			//mapSize: 2*1024*1024*1024, // maximum database size
			//maxDbs: 3
		});

		this._databaseInstance = this._databaseEnvironment.openDbi({
			name  : this._name,
			create: true
		});

		this._isOpen = true;
	}

	public remove (bucketKey:string, id:Buffer):boolean {
		var contact:ContactNodeObjectInterface = this.get(bucketKey, id);
		var lastSeen:number;
		var txn:lmdb.Txn;

		if (contact === null) {
			return true;
		}

		lastSeen = contact.lastSeen;

		txn = this._beginTransaction();
		try {
			// remove shortcut
			txn.del(this._databaseInstance, this._getLastSeenKey(bucketKey, lastSeen));
		}
		catch (e) {
			console.error(e);
		}

		try {
			// remove object
			txn.del(this._databaseInstance, this._getIdKey(id));
		}
		catch (e) {
			console.error(e);
		}

		txn.commit();

		return true;
	}

	public size (bucketKey:string):number {
		var txn:lmdb.Txn = this._beginReadOnlyTransaction();
		var cursor:lmdb.Cursor = this._getCursor(txn);
		var size:number = 0;

		bucketKey = this._getBucketKey(bucketKey);

		// Go the the first occourence of `bucketKey` and iterate from there
		for (var found = cursor.goToRange(bucketKey); found; found = cursor.goToNext()) {
			// Stop the loop if the current key is no longer part of the bucket
			if (found.indexOf(bucketKey) !== 0) {
				break;
			}

			size++;
		}

		cursor.close();
		txn.commit();

		return size;
	}

	/**
	 * Adds the given object within the specified transaction `txn` to the database
	 *
	 * @method core.topology.BucketStore~_add
	 *
	 * @param {lmdb.Txn} txn
	 * @param {string} bucketKey
	 * @param {Buffer} id
	 * @param {number} lastSeen
	 * @param {any} addresses
	 * @returns {boolean}
	 */
	private _add (txn:lmdb.Txn, bucketKey:string, id:Buffer, lastSeen:number, addresses:any) {
		var idKey:string = this._getIdKey(id);
		var lastSeenKey:string = this._getLastSeenKey(bucketKey, lastSeen);
		var value:Object = {
			addresses: addresses,
			id       : id,
			lastSeen : lastSeen
		};

		try {

			// stores the object with id as it's key
			/*
			// multi row test
			txn.putBinary(this._databaseInstance, this._getPropertyKey(id, 'id'), id);
			txn.putNumber(this._databaseInstance, this._getPropertyKey(id, 'lastSeen'), lastSeen);
			txn.putString(this._databaseInstance, this._getPropertyKey(id, 'addresses'), JSON.stringify(addresses));
			*/
			txn.putString(this._databaseInstance, idKey, JSON.stringify(value));

			// stores a shortcut for bucketwide last seen searches.
			// node-lmdb uses the old (slow buffer)! Therefore we're using much faster strings at the moment.
			txn.putBinary(this._databaseInstance, lastSeenKey, id);
			//txn.putString(this._databaseInstance, lastSeenKey, id.toJSON());
		}
		catch (err) {
			console.error(err);
		}

		return true;
	}

	/**
	 * Creates a read-only transaction object on the instance environment
	 *
	 * @method core.topology.BucketStore~_beginReadOnlyTransaction
	 *
	 * @returns {lmdb.Txn}
	 */
	private _beginReadOnlyTransaction ():any {
		// todo replace with propper options
		var opts:Object = {
			readOnly: true
		};

		return this._databaseEnvironment.beginTxn(opts);
	}

	/**
	 * Creates a writable transaction object on the instance environment
	 *
	 * @method core.topology.BucketStore~_beginTransaction
	 *
	 * @returns {lmdb.Txn}
	 */
	private _beginTransaction ():any {
		// todo replace with propper options
		var opts:Object = {};

		return this._databaseEnvironment.beginTxn(opts);
	}

	/**
	 *
	 * @method core.topology.BucketStore~_get
	 *
	 * @param {lmdbTxn} txn
	 * @param {Buffer} id
	 * @returns {any}
	 */
	private _get(txn:lmdb.Txn, id:Buffer):any {
		/*
		multi row test
		var contact = {
			addresses: JSON.parse(txn.getString(this._databaseInstance, this._getPropertyKey(id, 'addresses'))),
			id: txn.getBinary(this._databaseInstance, this._getPropertyKey(id, 'id')),
			lastSeen: txn.getNumber(this._databaseInstance, this._getPropertyKey(id, 'lastSeen'))
		};

		return contact;*/

		return JSON.parse(txn.getString(this._databaseInstance, this._getIdKey(id)));
	}

	/**
	 * Creates a Cursor on the instace database
	 *
	 * @method core.topology.BucketStore~_getCursor
	 *
	 * @returns {lmdb.Txn}
	 */
	private _getCursor (txn:any):any {
		return new lmdb.Cursor(txn, this._databaseInstance);
	}

	/**
	 * Returns the internally used key for bucket wide searches
	 *
	 * @method core.topology.BucketStore~_getBucketKey

	 * @param {string} key
	 * @returns {string}
	 */
	private _getBucketKey (key:string):string {
		return key + '-';
	}

	/**
	 * Returns the internally used key for id related searches
	 *
	 * @method core.topology.BucketStore~_getIdKey

	 * @param {Buffer} id
	 * @returns {string}
	 */
	private _getIdKey (id:Buffer):string {
		return this._getIdValue(id);
	}

	/**
	 * Returns the id as a formatted string
	 *
	 * @method core.topology.BucketStore~_getIdValue
	 *
	 * @param {Buffer} id
	 * @returns {string}
	 */
	private _getIdValue (id:Buffer):string {
		return id.toString('hex');
	}

	/**
	 * Returns a {@link core.topology.BucketStore#_getIdKey} prefixed key to store objects within the `bucketKey` namespace
	 *
	 * @method core.topology.BucketStore#_getLastSeenKey
	 *
	 * @param {string} bucketKey
	 * @param {number} lastSeen
	 * @returns {string}
	 */
	private _getLastSeenKey (bucketKey:string, lastSeen:number):string {
		return this._getBucketKey(bucketKey) + lastSeen;
	}

	/**
	 * We'll use this method eventually in the future when node-lmdb updates it's internall class from SlowBuffer to teh new
	 * node Buffer implementation.
	 *
	 * @method core.topology.BucketStore~_getPropertyKey
	 *
	 * @param {Buffer} id
	 * @param {string} propertyName The name of the property
	 * @returns {string}
	 */
	/*private _getPropertyKey(id:Buffer, propertyName:string):string {
		return this._getIdKey(id) + '-' + propertyName;
	}*/

}

export = BucketStore;