/**
 * Created by joernroeder on 4/23/14.
 */

/// <reference path='BucketInterface.d.ts' />
/// <reference path='BucketStoreInterface.d.ts' />
/// <reference path='../config/Config.d.ts' />

var Id = require('./Id');

/**
 * @namespace topology
 */

/**
 * @class topology.Bucket
 */
class Bucket implements BucketInterface {

	/**
	 * @private
	 */
	private _config:ConfigInterface = null;

	/**
	 * @private
	 */
	_store:BucketStoreInterface = null;

	/**
	 *
	 * @private
	 */
	_key:string = '';

	/**
	 *
	 * @type {number}
	 * @private
	 */
	_k:number = -1;

	constructor(config:ConfigInterface, key:string, store:BucketStoreInterface) {
		this._config = config;
		this._key = key;
		this._store = store;

		this.open()
	}

	add(contact:ContactNodeInterface):boolean {
		return this._store.add(
			this._key,
			contact.getId(),
			contact.getLastSeen(),
			contact.getAddresses(),
			contact.getPublicKey()
		);
	}

	remove(id:DistanceMetric):boolean {
		return this._store.remove(this._key, id);
	}

	get(id:DistanceMetric):any {
		return this._store.get(this._key, id);
	}

	contains(contact:ContactNodeInterface):boolean {
		return this._store.contains(this._key, contact.getId());
	}

	update(contact:ContactNodeInterface):boolean {
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

	size():number {
		return this._store.size(this._key);
	}

	close():void {
		this._store.close();
	}

	open():void {
		this._store.open();
	}

	isOpen():boolean {
		return this._store.isOpen();
	}
}

export = Bucket;