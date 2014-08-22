var path = require('path');
var fs = require('fs');

/**
* Simple JavaScript Object Bucket store implementation.
*
* @class core.topology.ObjectBucketStore
* @implements core.topology.BucketStoreInterface
*
* @param {string} filename The name of the file to which the buckets should be persisted.
* @param {string} folderPath The path of the folder in which the persisted file should be stores / is located.
*/
var ObjectBucketStore = (function () {
    function ObjectBucketStore(filename, folderPath) {
        /**
        * Holds the arrays of stored contact node objects
        *
        * @member {[bucketKey:string]:ContactNodeObjectListInterface} core.topology.ObjectBucketStore~_buckets
        */
        this._buckets = {};
        /**
        * The path of the folder in which to store the persisted buckets.
        *
        * @member {string} core.topology.ObjectBucketStore~_dbFolderFs
        */
        this._dbFolderFs = null;
        /**
        * The full path to the file to which the buckets are persisted.
        *
        * @member {string} core.topology.ObjectBucketStore~_dbPathFs
        */
        this._dbPathFs = null;
        /**
        * Indicates if the store is open
        *
        * @member {boolean} core.topology.ObjectBucketStore~_isOpen
        */
        this._isOpen = false;
        /**
        * Indicates if the store is currently written to file.
        *
        * @member {boolean} core.topology.ObjectBucketStore~_isWritingFs
        */
        this._isWritingFs = false;
        /**
        * Indicates whether the buckets can be persisted to a file. This is false
        * if e.g. the db folder path does not exist.
        *
        * @member {boolean} core.topology.ObjectBucketStore~_isUnwritableFs
        */
        this._isUnwritableFs = false;
        /**
        * Stores the `setImmediate`-Object to delay writes and especially prevent queuing of unnecessary file writes.
        *
        * @member {any} core.topology.ObjectBucketStore~_persistImmediate
        */
        this._persistImmediate = null;
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
    ObjectBucketStore.prototype._addToBucket = function (bucket, id, lastSeen, addresses) {
        var addressArray = [];

        var objectToAdd = {
            addresses: addressArray,
            id: id.toString('hex'),
            lastSeen: lastSeen
        };

        for (var i = 0, l = addresses.length; i < l; i++) {
            var address = addresses[i];
            var port = address.getPort();
            var ip = address.getIp();

            if (!(port && ip))
                continue;

            addressArray.push({
                _ip: address.getIp(),
                _port: address.getPort()
            });
        }

        if (!addressArray.length)
            return false;

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

    /**
    * Persists a JSON string representation of the current bucket state to a file.
    * File writes are scheduled after I/O callback via `setImmediate`. To prevent an
    * unnecessary high amount of file writes, only one write-cycle is scheduled per event loop.
    *
    * @method core.topology.ObjectBucketStore~_persistDb
    */
    ObjectBucketStore.prototype._persistDb = function () {
        var _this = this;
        if (this._isUnwritableFs || this._isWritingFs || (!this._isOpen)) {
            return;
        }

        if (this._persistImmediate) {
            clearImmediate(this._persistImmediate);
        }

        this._persistImmediate = setImmediate(function () {
            _this._persistImmediate = null;
            _this._isWritingFs = true;

            var dataToPersist = JSON.stringify(_this._buckets);

            if (dataToPersist) {
                fs.writeFile(_this._dbPathFs, dataToPersist, { encoding: 'utf8' }, function (err) {
                    if (err) {
                        console.log('ObjectBucketStorePersistErr %o', err.message);
                    }
                    _this._isWritingFs = false;
                });
            }
        });
    };

    ObjectBucketStore.prototype.add = function (bucketKey, id, lastSeen, addresses) {
        var res = this._addToBucket(this._getBucket(bucketKey), id, lastSeen, addresses);

        this._persistDb();

        return res;
    };

    ObjectBucketStore.prototype.addAll = function (bucketKey, contacts) {
        var bucket = this._getBucket(bucketKey);

        for (var i = 0, l = contacts.length; i < l; i++) {
            var contact = contacts[i];
            this._addToBucket(bucket, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        }

        this._persistDb();

        return true;
    };

    ObjectBucketStore.prototype.close = function () {
        if (!this._isOpen)
            return;

        this._persistDb();
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
        if (this._isOpen)
            return;

        if (!fs.existsSync(this._dbFolderFs)) {
            this._isUnwritableFs = true;
        } else if (fs.existsSync(this._dbPathFs)) {
            try  {
                var contents = fs.readFileSync(this._dbPathFs, { encoding: 'utf8' });
                if (contents) {
                    var existingBuckets = JSON.parse(contents);
                    if (existingBuckets) {
                        this._buckets = existingBuckets;
                    }
                }
            } catch (e) {
                fs.unlinkSync(this._dbPathFs);
            }
        }

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

        this._persistDb();

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
