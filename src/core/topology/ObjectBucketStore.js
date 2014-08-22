/**
* Simple JavaScript Object Bucket store implementation.
*
* @class core.topology.ObjectBucketStore
* @implements core.topology.BucketStoreInterface
*/
var ObjectBucketStore = (function () {
    function ObjectBucketStore() {
        /**
        * Holds the arrays of stored contact node objects
        *
        * @member {[bucketKey:string]:ContactNodeObjectListInterface} core.topology.ObjectBucketStore~_buckets
        */
        this._buckets = {};
        /**
        * Indicates if the store is open
        *
        * @member {boolean} core.topology.ObjectBucketStore~_isOpen
        */
        this._isOpen = true;
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
    ObjectBucketStore.prototype._addToBucket = function (bucket, id, lastSeen, addresses) {
        var addressArray = [];

        var objectToAdd = {
            addresses: addressArray,
            id: id.toString('hex'),
            lastSeen: lastSeen
        };

        for (var i = 0, l = addresses.length; i < l; i++) {
            var address = addresses[i];

            addressArray.push({
                _ip: address.getIp(),
                _port: address.getPort()
            });
        }

        // add the object at the right position (most recent objects at the beginning)
        var added = false;
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
    };

    /**
    * Returns the bucket stored under the given key. If no bucket is yet stored, a fresh array is set under the
    * given key.
    *
    * @method core.topology.ObjectBucketStore~_getBucket
    *
    * @param {string} bucketKey
    * @returns {ContactNodeObjectListInterface}
    */
    ObjectBucketStore.prototype._getBucket = function (bucketKey) {
        var bucket = this._buckets[bucketKey];

        if (!bucket) {
            this._buckets[bucketKey] = bucket = [];
        }

        return bucket;
    };

    /**
    * Returns an object copy of a stored object, with the only exception that the stored id is transferred to
    * a JSON-Buffer representation.
    *
    * @method core.topology.ObjectBucketStore~_mutableSafeCopy
    *
    * @param {core.topology.ContactNodeObjectInterface} storedObj The stored object to copy.
    * @returns {core.topology.ContactNodeObjectInterface}
    */
    ObjectBucketStore.prototype._mutableSafeCopy = function (storedObj) {
        var obj = {
            addresses: [],
            id: (new Buffer(storedObj.id, 'hex')).toJSON(),
            lastSeen: storedObj.lastSeen
        };

        var addresses = storedObj.addresses;

        for (var i = 0, l = addresses.length; i < l; i++) {
            var address = addresses[i];
            obj.addresses.push({ _ip: address._ip, _port: address._port });
        }

        return obj;
    };

    ObjectBucketStore.prototype.add = function (bucketKey, id, lastSeen, addresses) {
        return this._addToBucket(this._getBucket(bucketKey), id, lastSeen, addresses);
    };

    ObjectBucketStore.prototype.addAll = function (bucketKey, contacts) {
        var bucket = this._getBucket(bucketKey);

        for (var i = 0, l = contacts.length; i < l; i++) {
            var contact = contacts[i];
            this._addToBucket(bucket, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        }

        return true;
    };

    ObjectBucketStore.prototype.close = function () {
        this._isOpen = false;
    };

    ObjectBucketStore.prototype.contains = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return false;

        var idToCheck = id.toString('hex');
        var contains = false;

        for (var i = 0, l = bucket.length; i < l; i++) {
            if (bucket[i].id === idToCheck) {
                contains = true;
                break;
            }
        }

        return contains;
    };

    ObjectBucketStore.prototype.get = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return null;

        var found = null;
        var idToSearch = id.toString('hex');

        for (var i = 0, l = bucket.length; i < l; i++) {
            if (bucket[i].id === idToSearch) {
                found = bucket[i];
                break;
            }
        }

        return found ? this._mutableSafeCopy(found) : null;
    };

    ObjectBucketStore.prototype.getAll = function (bucketKey) {
        var retList = [];
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return retList;

        for (var i = 0, l = bucket.length; i < l; i++) {
            var storedObj = bucket[i];
            if (storedObj) {
                retList.push(this._mutableSafeCopy(storedObj));
            }
        }

        return retList;
    };

    ObjectBucketStore.prototype.getLongestNotSeen = function (bucketKey) {
        var longestNotSeen = null;
        var bucket = this._buckets[bucketKey];

        if (bucket) {
            var bucketLength = bucket.length;

            if (bucketLength) {
                longestNotSeen = this._mutableSafeCopy(bucket[bucketLength - 1]);
            }
        }

        return longestNotSeen;
    };

    ObjectBucketStore.prototype.getRandom = function (bucketKey) {
        var bucket = this._buckets[bucketKey];

        if (bucket) {
            var bucketLength = bucket.length;

            if (bucketLength) {
                return this._mutableSafeCopy(bucket[Math.floor(Math.random() * bucketLength)]);
            }
        }

        return null;
    };

    ObjectBucketStore.prototype.isOpen = function () {
        return this._isOpen;
    };

    ObjectBucketStore.prototype.open = function () {
        this._isOpen = true;
    };

    ObjectBucketStore.prototype.remove = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return true;

        var idToSearch = id.toString('hex');
        var spliceIndex = undefined;

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
    };

    ObjectBucketStore.prototype.size = function (bucketKey) {
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return 0;

        return bucket.length;
    };
    return ObjectBucketStore;
})();

module.exports = ObjectBucketStore;
//# sourceMappingURL=ObjectBucketStore.js.map
