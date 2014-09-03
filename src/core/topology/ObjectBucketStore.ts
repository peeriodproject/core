/// <reference path='../../main.d.ts' />

import path = require('path');
import fs = require('fs-extra');

import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ContactNodeObjectInterface = require('./interfaces/ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('./interfaces/ContactNodeObjectListInterface');
import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');
import ContactNodeAddressListInterface = require('./interfaces/ContactNodeAddressListInterface');

/**
 * Simple JavaScript Object Bucket store implementation.
 *
 * @class core.topology.ObjectBucketStore
 * @implements core.topology.BucketStoreInterface
 *
 * @param {string} filename The name of the file to which the buckets should be persisted.
 * @param {string} folderPath The path of the folder in which the persisted file should be stores / is located.
 */
class ObjectBucketStore implements BucketStoreInterface {

	/**
	 * Holds the arrays of stored contact node objects
	 *
	 * @member {[bucketKey:string]:ContactNodeObjectListInterface} core.topology.ObjectBucketStore~_buckets
	 */
	private _buckets:{[bucketKey:string]:ContactNodeObjectListInterface} = {};

	/**
	 * The path of the folder in which to store the persisted buckets.
	 *
	 * @member {string} core.topology.ObjectBucketStore~_dbFolderFs
	 */
	private _dbFolderFs:string = null;

	/**
	 * The full path to the file to which the buckets are persisted.
	 *
	 * @member {string} core.topology.ObjectBucketStore~_dbPathFs
	 */
	private _dbPathFs:string = null;

	/**
	 * Stores the number of ms to delay the persisting of bucket changes. Used to prevent
	 * unnecessary queuing of consecutive file writes.
	 *
	 * @member {number} core.topology.ObjectBucketStore~_delayPersistInMs
	 */
	private _delayPersistInMs:number = 0;

	/**
	 * Indicates if the store is open
	 *
	 * @member {boolean} core.topology.ObjectBucketStore~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * Indicates if the store is currently written to file.
	 *
	 * @member {boolean} core.topology.ObjectBucketStore~_isWritingFs
	 */
	private _isWritingFs:boolean = false;

	/**
	 * Indicates whether the buckets can be persisted to a file. This is false
	 * if e.g. the db folder path does not exist.
	 *
	 * @member {boolean} core.topology.ObjectBucketStore~_isUnwritableFs
	 */
	private _isUnwritableFs:boolean = false;

	/**
	 * Stores the `setTimeout`-Object to delay writes and especially prevent queuing of unnecessary file writes.
	 *
	 * @member {any} core.topology.ObjectBucketStore~_persistTimeout
	 */
	private _persistTimeout:any = null;

	public constructor (filename:string, folderPath:string, delayPersistInSeconds:number) {
		this._delayPersistInMs = delayPersistInSeconds * 1000;
		this._dbPathFs = path.join(folderPath, filename);
		this._dbFolderFs = folderPath;

		this.open();
	}

	/**
	 * Adds an object with the given attributes to a proided bucket (array).
	 * The object is added at the right position, sorted by `lastSeen`.
	 * Most recently seen nodes at the beginning, least recently seen nodes at the end.
	 *
	 * @method core.topology.ObjectBucketStore~_addToBucket
	 *
	 * @param {core.topology.ContactNodeObjectListInterface} bucket The bucket to add to.
	 * @param {Buffer} id
	 * @param {number} lastSeen
	 * @param {any} addresses
	 *
	 * @returns {boolean} true
	 */
	private _addToBucket (bucket:ContactNodeObjectListInterface, id:Buffer, lastSeen:number, addresses:any):boolean {
		var addressArray = [];

		var objectToAdd:ContactNodeObjectInterface = {
			addresses: addressArray,
			id       : id.toString('hex'),
			lastSeen : lastSeen
		};

		// build up the addresses
		for (var i = 0, l = addresses.length; i < l; i++) {
			var address:ContactNodeAddressInterface = addresses[i];
			var port:number = address.getPort();
			var ip:string = address.getIp();

			if (!(port && ip)) continue;

			addressArray.push({
				_ip  : address.getIp(),
				_port: address.getPort()
			});
		}

		if (!addressArray.length) return false;

		// add the object at the right position (most recent objects at the beginning)
		var added:boolean = false;
		for (var i = 0, k = bucket.length; i < k; i++) {
			if (lastSeen >= bucket[i].lastSeen) {
				bucket.splice(i, 0, objectToAdd);
				added = true;
				break;
			}
		}

		if (!added) {
			bucket.push(objectToAdd);
		}

		return true;
	}

	/**
	 * Returns the bucket stored under the given key. If no bucket is yet stored, a fresh array is set under the
	 * given key.
	 *
	 * @method core.topology.ObjectBucketStore~_getBucket
	 *
	 * @param {string} bucketKey
	 * @returns {ContactNodeObjectListInterface}
	 */
	private _getBucket (bucketKey:string):Array<ContactNodeObjectInterface> {
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) {
			this._buckets[bucketKey] = bucket = [];
		}

		return bucket;
	}

	/**
	 * Returns an object copy of a stored object, with the only exception that the stored id is transferred to
	 * a JSON-Buffer representation.
	 *
	 * @method core.topology.ObjectBucketStore~_mutableSafeCopy
	 *
	 * @param {core.topology.ContactNodeObjectInterface} storedObj The stored object to copy.
	 * @returns {core.topology.ContactNodeObjectInterface}
	 */
	private _mutableSafeCopy (storedObj:ContactNodeObjectInterface):ContactNodeObjectInterface {

		var obj = {
			addresses: [],
			id       : (new Buffer(storedObj.id, 'hex')).toJSON(),
			lastSeen : storedObj.lastSeen
		};

		var addresses = storedObj.addresses;

		for (var i = 0, l = addresses.length; i < l; i++) {
			var address = addresses[i];
			obj.addresses.push({_ip: address._ip, _port: address._port});
		}

		return obj;
	}

	/**
	 * Persists a JSON string representation of the current bucket state to a file.
	 * To prevent an unnecessary high amount of file writes, write-cycles are delayed with a timeout.
	 *
	 * @method core.topology.ObjectBucketStore~_persistDb
	 */
	private _persistDb ():void {
		if (this._isUnwritableFs || this._isWritingFs || (!this._isOpen)) {
			return;
		}

		if (this._persistTimeout) {
			clearTimeout(this._persistTimeout);
		}

		this._persistTimeout = setTimeout(() => {
			this._persistTimeout = null;
			this._isWritingFs = true;

			var dataToPersist:string = JSON.stringify(this._buckets);

			if (dataToPersist) {
				fs.writeFile(this._dbPathFs, dataToPersist, {encoding: 'utf8'}, (err:Error) => {
					this._isWritingFs = false;
				});
			}
		}, this._delayPersistInMs);

	}

	public add (bucketKey:string, id:Buffer, lastSeen:number, addresses:any):boolean {
		var res:boolean = this._addToBucket(this._getBucket(bucketKey), id, lastSeen, addresses);

		this._persistDb();

		return res;
	}

	public addAll (bucketKey:string, contacts:any):boolean {
		var bucket:ContactNodeObjectListInterface = this._getBucket(bucketKey);

		for (var i = 0, l = contacts.length; i < l; i++) {
			var contact = contacts[i];
			this._addToBucket(bucket, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		}

		this._persistDb();

		return true;
	}

	public close ():void {
		if (!this._isOpen) return;

		this._persistDb();
		this._isOpen = false;
	}

	public contains (bucketKey:string, id:Buffer):boolean {
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) return false;

		var idToCheck:string = id.toString('hex');
		var contains:boolean = false;

		for (var i = 0, l = bucket.length; i < l; i++) {
			if (bucket[i].id === idToCheck) {
				contains = true;
				break;
			}
		}

		return contains;
	}

	public get (bucketKey:string, id:Buffer):ContactNodeObjectInterface {
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) return null;

		var found:ContactNodeObjectInterface = null;
		var idToSearch:string = id.toString('hex');

		for (var i = 0, l = bucket.length; i < l; i++) {
			if (bucket[i].id === idToSearch) {
				found = bucket[i];
				break;
			}
		}

		return found ? this._mutableSafeCopy(found) : null;
	}

	public getAll (bucketKey:string):ContactNodeObjectListInterface {
		var retList:ContactNodeObjectListInterface = [];
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) return retList;

		for (var i = 0, l = bucket.length; i < l; i++) {
			var storedObj:ContactNodeObjectInterface = bucket[i];
			if (storedObj) {
				retList.push(this._mutableSafeCopy(storedObj));
			}
		}

		return retList;
	}

	public getLongestNotSeen (bucketKey:string):ContactNodeObjectInterface {
		var longestNotSeen:ContactNodeObjectInterface = null;
		var bucket = this._buckets[bucketKey];

		if (bucket) {
			var bucketLength:number = bucket.length;

			if (bucketLength) {
				longestNotSeen = this._mutableSafeCopy(bucket[bucketLength - 1]);
			}
		}

		return longestNotSeen;
	}

	public getRandom (bucketKey:string):ContactNodeObjectInterface {
		var bucket = this._buckets[bucketKey];

		if (bucket) {
			var bucketLength:number = bucket.length;

			if (bucketLength) {
				return this._mutableSafeCopy(bucket[Math.floor(Math.random() * bucketLength)]);
			}
		}

		return null;
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		if (this._isOpen) return;

		if (!fs.existsSync(this._dbFolderFs)) {
			this._isUnwritableFs = true;
		}
		// check if the database file exists
		else if (fs.existsSync(this._dbPathFs)) {
			// load the contents from the file
			try {
				var contents:string = fs.readFileSync(this._dbPathFs, {encoding: 'utf8'});
				if (contents) {
					var existingBuckets = JSON.parse(contents);
					if (existingBuckets) {
						this._buckets = existingBuckets;
					}
				}
			}
			catch (e) {
				fs.unlinkSync(this._dbPathFs);
			}
		}

		this._isOpen = true;
	}

	public remove (bucketKey:string, id:Buffer):boolean {
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) return true;

		var idToSearch:string = id.toString('hex');
		var spliceIndex:number = undefined;

		for (var i = bucket.length - 1; i >= 0; i--) {
			if (bucket[i].id === idToSearch) {
				spliceIndex = i;
				break;
			}
		}

		if (spliceIndex !== undefined) {
			bucket.splice(spliceIndex, 1);
		}

		this._persistDb();

		return true;
	}

	public size (bucketKey:string):number {
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) return 0;

		return bucket.length;
	}

}

export = ObjectBucketStore;