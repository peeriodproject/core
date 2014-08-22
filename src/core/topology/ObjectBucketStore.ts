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
 */
class ObjectBucketStore implements BucketStoreInterface {

	/**
	 * Holds the arrays of stored contact node objects
	 *
	 * @member {[bucketKey:string]:ContactNodeObjectListInterface} core.topology.ObjectBucketStore~_buckets
	 */
	private _buckets:{[bucketKey:string]:ContactNodeObjectListInterface} = {};

	/**
	 * Indicates if the store is open
	 *
	 * @member {boolean} core.topology.ObjectBucketStore~_isOpen
	 */
	private _isOpen:boolean = true;

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

			addressArray.push({
				_ip  : address.getIp(),
				_port: address.getPort()
			});
		}

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

	public add (bucketKey:string, id:Buffer, lastSeen:number, addresses:any):boolean {
		return this._addToBucket(this._getBucket(bucketKey), id, lastSeen, addresses);
	}

	public addAll (bucketKey:string, contacts:any):boolean {
		var bucket:ContactNodeObjectListInterface = this._getBucket(bucketKey);

		for (var i = 0, l = contacts.length; i < l; i++) {
			var contact = contacts[i];
			this._addToBucket(bucket, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		}

		return true;
	}

	public close ():void {
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

		return true;
	}

	public size (bucketKey:string):number {
		var bucket:ContactNodeObjectListInterface = this._buckets[bucketKey];

		if (!bucket) return 0;

		return bucket.length;
	}

}

export = ObjectBucketStore;