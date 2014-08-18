import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import ContactNodeObjectInterface = require('./interfaces/ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('./interfaces/ContactNodeObjectListInterface');

class BrutalObjectBucketStore implements BucketStoreInterface {

	private _buckets = {};
	private _open = true;

	close ():void {
		this._open = false;
	}

	isOpen ():boolean {
		return this._open;
	}

	open ():void {
		this._open = true;
	}

	private _add (bucketKey:string, id:Buffer, lastSeen:number, addresses:any):boolean {
		if (!this._buckets[bucketKey]) {
			this._buckets[bucketKey] = [];
		}

		var addressArray = [];

		for (var i=0, l=addresses.length; i<l; i++) {
			var address = addresses[i];
			addressArray.push({
				_ip: address.getIp(),
				_port: address.getPort(),
				_isV4: address.isIPv4(),
				_isV6: address.isIPv6()
			});
		}

		this._buckets[bucketKey].push({addresses: addressArray, id: id.toString('hex'), lastSeen: lastSeen});

		return true;
	}

	add (bucketKey:string, id:Buffer, lastSeen:number, addresses:any):boolean {
		return this._add(bucketKey, id, lastSeen, addresses);
	}

	addAll (bucketKey:string, contacts:any):boolean {
		for (var i=0, l=contacts.length; i<l; i++) {
			var contact = contacts[i];
			this._add(bucketKey, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		}

		return true;
	}

	contains (bucketKey:string, id:Buffer):boolean {
		var bucket = this._buckets[bucketKey];

		if (!bucket) return false;

		var idToCheck = id.toString('hex');
		var contains = false;

		for (var i=0, l=bucket.length; i<l; i++) {
			if (bucket[i].id === idToCheck) {
				contains = true;
				break;
			}
		}

		return contains;
	}

	private _mutableSafeCopy (storedObj:any):ContactNodeObjectInterface {

		var obj = {
			addresses: [],
			id: (new Buffer(storedObj.id, 'hex')).toJSON(),
			lastSeen: storedObj.lastSeen
		};

		var addresses = storedObj.addresses;

		for (var i=0,l=addresses.length; i<l; i++) {
			var address = addresses[i];
			obj.addresses.push({_ip: address._ip, _port: address._port, _isV4: address._isV4, _isV6: address._isV6});
		}

		return obj;
	}

	get (bucketKey:string, id:Buffer):ContactNodeObjectInterface {
		var bucket = this._buckets[bucketKey];

		if (!bucket) return null;

		var found = null;
		var idToSearch = id.toString('hex');

		for (var i=0, l=bucket.length; i<l; i++) {
			if (bucket[i].id === idToSearch) {
				found = bucket[i];
				break;
			}
		}

		return found ? this._mutableSafeCopy(found) : null;
	}

	getAll (bucketKey:string):ContactNodeObjectListInterface {
		var retList = [];
		var bucket = this._buckets[bucketKey];

		if (!bucket) return retList;

		for (var i=0, l=bucket.length; i<l; i++) {
			if (bucket[i]) {
				retList.push(this._mutableSafeCopy(bucket[i]));
			}
		}

		return retList;
	}

	getLongestNotSeen (bucketKey:string):ContactNodeObjectInterface {
		var longestNotSeenNum = undefined;
		var bucket = this._buckets[bucketKey];

		if (!(bucket && bucket.length)) return null;

		var retIndex = 0;

		for (var i=0, l=bucket.length; i<l; i++) {
			var lastSeen = bucket[i].lastSeen;

			if (longestNotSeenNum === undefined) {
				longestNotSeenNum = lastSeen;
			}
			else if (lastSeen < longestNotSeenNum) {
				longestNotSeenNum = lastSeen;
				retIndex = i;
			}
		}

		return this._mutableSafeCopy(bucket[retIndex]);
	}

	getRandom (bucketKey:string):ContactNodeObjectInterface {
		var bucket = this._buckets[bucketKey];

		if (!(bucket && bucket.length)) return null;

		return this._mutableSafeCopy(bucket[Math.floor(Math.random() * bucket.length)]);
	}

	remove (bucketKey:string, id:Buffer):boolean {
		var bucket = this._buckets[bucketKey];

		if (!bucket) return true;

		var idToSearch = id.toString('hex');
		var spliceIndex = undefined;

		for (var i=0, l=bucket.length; i<l; i++) {
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

	size (bucketKey:string):number {
		if (!this._buckets[bucketKey]) return 0;

		return this._buckets[bucketKey].length;
	}

}

export = BrutalObjectBucketStore;