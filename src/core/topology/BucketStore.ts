/**
 * Created by joernroeder on 4/23/14.
 */

/// <reference path='BucketStoreInterface.d.ts' />

var lmdb = require('node-lmdb');

/**
 * LMDB-BucketStore Implementation
 *
 * key format:
 */
class BucketStore implements BucketStoreInterface {

	/**
	 * @private
	 */
	_env:any = null;

	/**
	 * @private
	 */
	_dbi:any = null;

	/**
	 * @private
	 */
	_name:string = '';

	/**
	 * @private
	 */
	_path:string = '';

	/**
	 * Indicates wheather the store is open or closed
	 *
	 * @private
	 */
	_isOpen:boolean = false;

	private _getBucketKey(key:string):string {
		return key + '-';
	}

	private _getIdValue(id:DistanceMetric):string {
		return id.toBitString();
	}

	private _getIdKey(id:DistanceMetric):string {
		return this._getIdValue(id);
	}

	private _getLastSeenKey(bucketKey:string, lastSeen:number):string {
		return this._getBucketKey(bucketKey) + lastSeen;
	}

	private _beginTransaction():any {
		// todo replace with propper options
		var opts = {};

		return this._env.beginTxn(opts);
	}

	private _beginReadOnlyTransaction():any {
		// todo replace with propper options
		var opts = {};

		opts['readOnly'] = true;

		return this._env.beginTxn(opts);
	}

	private _getCursor(txn:any):any {
		return new lmdb.Cursor(txn, this._dbi);
	}

	constructor(name:string, path:string) {
		this._name = name;
		this._path = path;

		this.open();

		var txn = this._beginTransaction();

		txn.putString(this._dbi, 'END', true);
		txn.commit();
	}

	get(bucketKey:string, id:DistanceMetric):any {
		var txn = this._beginReadOnlyTransaction(),
			cursor = this._getCursor(txn),
			value = txn.getString(this._dbi, this._getIdKey(id));

		cursor.close();
		txn.commit();

		return value;
	}

	remove(bucketKey:string, id:DistanceMetric):boolean {
		var contact = this.get(bucketKey, id),
			lastSeen = 0;

		if (null === contact) {
			return true;
		}

		lastSeen = JSON.parse(contact).lastSeen;

		var txn = this._beginTransaction();
		// remove shortcut
		txn.del(this._dbi, this._getLastSeenKey(bucketKey, lastSeen));
		// remove object
		txn.del(this._dbi, this._getIdKey(id));
		txn.commit();

		return true;
	}

	add(bucketKey:string, id:DistanceMetric, lastSeen:number, addresses:any, publicKey:string):boolean {
		var txn = this._beginTransaction(),
			added = false;

		added = this._add(txn, bucketKey, id, lastSeen, addresses, publicKey);
		txn.commit();

		return added;
	}

	addAll(bucketKey:string, contacts:any):boolean {
		var txn = this._beginTransaction(),
			added = false;

		for (var i in contacts) {
			var contact = contacts[i];

			added = this._add(txn, bucketKey,contact.id, contact.lastSeen, contact.addresses, contact.publicKey);
		}

		txn.commit();

		return added;
	}

	private _add(txn:any, bucketKey:string, id:DistanceMetric, lastSeen:number, addresses:any, publicKey:string) {
		var idKey = this._getIdKey(id),
			lastSeenKey = this._getLastSeenKey(bucketKey, lastSeen),
			value = {
				addresses: addresses,
				id: id,
				lastSeen: lastSeen,
				publicKey: publicKey
			};

		/*console.log('--- Adding ---------------');
		console.log(idKey);
		console.log(lastSeenKey);*/

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

	size(bucketKey:string):number {
		var txn = this._beginReadOnlyTransaction(),
			cursor = this._getCursor(txn),
			size = 0;

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

	contains(bucketKey:string, id:DistanceMetric):boolean {
		return (null === this.get(bucketKey, id)) ? false : true;
	}

	debug():void {
		var txn = this._beginReadOnlyTransaction();
		var cursor = this._getCursor(txn);

		// loop through all key-value pairs
		for (var found = cursor.goToFirst(); found; found = cursor.goToNext()) {
			cursor.getCurrentString(function(key, data) {
				console.log(key + "  " + data );
			});
		}

		cursor.close();
		txn.commit();
	}

	open():void {
		if (this._isOpen) return;

		this._env = new lmdb.Env();
		this._env.open({
			//name: this._name,
			path: this._path
			//mapSize: 2*1024*1024*1024, // maximum database size
			//maxDbs: 3
		});

		this._dbi = this._env.openDbi({
			name: this._name,
			create: true
		});

		this._isOpen = true;
	}

	close():void {
		if (!this._isOpen) return;

		this._isOpen = false;

		this._dbi.close();
		this._dbi = null;

		this._env.close();
		this._env = null;
	}

	isOpen():boolean {
		return this._isOpen;
	}
}

export = BucketStore;