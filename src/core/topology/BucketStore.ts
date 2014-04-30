/// <reference path='interfaces/BucketStoreInterface.ts' />
/// <reference path='../../../ts-definitions/node-lmdb/node-lmdb.d.ts' />

import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import IdInterface = require('./interfaces/IdInterface');
import lmdb = require('node-lmdb');

/**
 * LMDB-BucketStore Implementation
 *
 */
class BucketStore implements BucketStoreInterface {

	/**
	 * The internal lmdb database instance
	 *
	 * @private
	 * @member {lmdb.Dbi} core.topology.BucketStore#_dbi
	 */
	private _dbi:lmdb.Dbi = null;

	/**
	 * The internal lmdb database environment instance
	 *
	 * @private
	 * @member {lmdb.Env} core.topology.BucketStore#_env
	 */
	private _env:lmdb.Env = null;

	/**
	 * Indicates wheather the store is open or closed
	 *
	 * @private
	 * @member {boolean} core.topology.BucketStore#_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * The name of the internal database
	 *
	 * @private
	 * @member {boolean} core.topology.BucketStore#_name
	 */
	private _name:string = '';

	/**
	 * An absolute path where the database stores it's files
	 *
	 * @private
	 * @member {boolean} core.topology.BucketStore#_path
	 */
	private _path:string = '';

	constructor (name:string, path:string) {
		this._name = name;
		this._path = path;

		this.open();
	}

	public add (bucketKey:string, id:IdInterface, lastSeen:number, addresses:any, publicKey:string):boolean {
		var txn:lmdb.Txn = this._beginTransaction();
		var added:boolean = this._add(txn, bucketKey, id, lastSeen, addresses, publicKey);

		txn.commit();

		return added;
	}

	public addAll (bucketKey:string, contacts:any):boolean {
		var txn:lmdb.Txn = this._beginTransaction();
		var added:boolean = false;

		for (var i in contacts) {
			var contact = contacts[i];

			added = this._add(txn, bucketKey, contact.id, contact.lastSeen, contact.addresses, contact.publicKey);
		}

		txn.commit();

		return added;
	}

	public close ():void {
		if (!this._isOpen) {
			return;
		}

		this._isOpen = false;

		this._dbi.close();
		this._dbi = null;

		this._env.close();
		this._env = null;
	}

	public contains (bucketKey:string, id:IdInterface):boolean {
		return (this.get(bucketKey, id) !== null);
	}

	public debug ():void {
		var txn:lmdb.Txn = this._beginReadOnlyTransaction();
		var cursor:lmdb.Cursor = this._getCursor(txn);

		// loop through all key-value pairs
		for (var found = cursor.goToFirst(); found; found = cursor.goToNext()) {
			cursor.getCurrentString(function (key, data) {
				console.log(key + "  " + data);
			});
		}

		cursor.close();
		txn.commit();
	}

	public get (bucketKey:string, id:IdInterface):any {
		var txn:lmdb.Txn = this._beginReadOnlyTransaction();
		var cursor:lmdb.Cursor = this._getCursor(txn);
		var value:string = txn.getString(this._dbi, this._getIdKey(id));

		cursor.close();
		txn.commit();

		return value;
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		if (this._isOpen) return;

		this._env = new lmdb.Env();
		this._env.open({
			//name: this._name,
			path: this._path
			//mapSize: 2*1024*1024*1024, // maximum database size
			//maxDbs: 3
		});

		this._dbi = this._env.openDbi({
			name  : this._name,
			create: true
		});

		this._isOpen = true;
	}

	public remove (bucketKey:string, id:IdInterface):boolean {
		// todo Typescript: propper return type (callback vs return)
		var contact:any = this.get(bucketKey, id);
		var lastSeen:number;
		var txn:lmdb.Txn;

		if (contact === null) {
			return true;
		}

		lastSeen = JSON.parse(contact).lastSeen;

		txn = this._beginTransaction();
		// remove shortcut
		txn.del(this._dbi, this._getLastSeenKey(bucketKey, lastSeen));
		// remove object
		txn.del(this._dbi, this._getIdKey(id));
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
	 * @private
	 * @method {boolean} core.topology.BucketStore~_add
	 *
	 * @param {lmdb.Txn} txn
	 * @param {string} bucketKey
	 * @param {core.topology.IdInterface} id
	 * @param {number} lastSeen
	 * @param {any} addresses
	 * @param {string} publicKey
	 * @returns {boolean}
	 */
	private _add (txn:any, bucketKey:string, id:IdInterface, lastSeen:number, addresses:any, publicKey:string) {
		var idKey:string = this._getIdKey(id);
		var lastSeenKey:string = this._getLastSeenKey(bucketKey, lastSeen);
		var value:Object = {
			addresses: addresses,
			id       : id,
			lastSeen : lastSeen,
			publicKey: publicKey
		};

		try {
			// stores the object with id as it's key
			txn.putString(this._dbi, idKey, JSON.stringify(value));

			// stores a shortcut for bucketwide last seen searches.
			txn.putString(this._dbi, lastSeenKey, this._getIdValue(id));
		}
		catch (err) {
			console.error(err);
		}

		return true;
	}

	/**
	 * Creates a read-only transaction object on the instance environment
	 *
	 * @private
	 * @method {boolean} core.topology.BucketStore~_beginReadOnlyTransaction
	 *
	 * @returns {lmdb.Txn}
	 */
	private _beginReadOnlyTransaction ():any {
		// todo replace with propper options
		var opts:Object = {};

		opts['readOnly'] = true;

		return this._env.beginTxn(opts);
	}

	/**
	 * Creates a writable transaction object on the instance environment
	 *
	 * @private
	 * @method {boolean} core.topology.BucketStore~_beginTransaction
	 *
	 * @returns {lmdb.Txn}
	 */
	private _beginTransaction ():any {
		// todo replace with propper options
		var opts:Object = {};

		return this._env.beginTxn(opts);
	}

	/**
	 * Creates a Cursor on the instace database
	 *
	 * @private
	 * @method {boolean} core.topology.BucketStore~_getCursor
	 *
	 * @returns {lmdb.Txn}
	 */
	private _getCursor (txn:any):any {
		return new lmdb.Cursor(txn, this._dbi);
	}

	/**
	 * Returns the internally used key for bucket wide searches
	 *
	 * @private
	 * @method {boolean} core.topology.BucketStore~_getBucketKey

	 * @param {string} key
	 * @returns {string}
	 */
	private _getBucketKey (key:string):string {
		return key + '-';
	}

	/**
	 * Returns the internally used key for id related searches
	 *
	 * @private
	 * @method {boolean} core.topology.BucketStore~_getIdKey

	 * @param {string} id
	 * @returns {string}
	 */
	private _getIdKey (id:IdInterface):string {
		return this._getIdValue(id);
	}

	/**
	 * Returns the id as a formatted string
	 *
	 * @method {boolean} core.topology.BucketStore~_getIdValue
	 *
	 * @param {core.topology.IdInterface} id
	 * @returns {string}
	 */
	private _getIdValue (id:IdInterface):string {
		return id.toBitString();
	}

	/**
	 * Returns a {@link core.topology.BucketStore~getIdKey} prefixed key to store objects within the `bucketKey` namespace
	 *
	 * @method {boolean} core.topology.BucketStore~_getLastSeenKey
	 *
	 * @param {string} bucketKey
	 * @param {number} lastSeen
	 * @returns {string}
	 */
	private _getLastSeenKey (bucketKey:string, lastSeen:number):string {
		return this._getBucketKey(bucketKey) + lastSeen;
	}
}

export = BucketStore;