var BrutalObjectBucketStore = (function () {
    function BrutalObjectBucketStore() {
        this._buckets = {};
        for (var i = 0; i < 160; i++) {
            this._buckets[i.toString()] = {};
        }
    }
    BrutalObjectBucketStore.prototype.close = function () {
    };

    BrutalObjectBucketStore.prototype.isOpen = function () {
        return true;
    };

    BrutalObjectBucketStore.prototype.open = function () {
    };

    BrutalObjectBucketStore.prototype._add = function (bucketKey, id, lastSeen, addresses) {
        var addressArray = [];

        for (var i = 0, l = addresses.length; i < l; i++) {
            var address = addresses[i];
            addressArray.push({
                _ip: address.getIp(),
                _port: address.getPort()
            });
        }

        this._buckets[bucketKey].push({ addresses: addressArray, id: id.toString('hex'), lastSeen: lastSeen });

        return true;
    };

    BrutalObjectBucketStore.prototype.add = function (bucketKey, id, lastSeen, addresses) {
        return this._add(bucketKey, id, lastSeen, addresses);
    };

    BrutalObjectBucketStore.prototype.addAll = function (bucketKey, contacts) {
        for (var i = 0, l = contacts.length; i < l; i++) {
            var contact = contacts[i];
            this._add(bucketKey, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        }

        return true;
    };

    BrutalObjectBucketStore.prototype.contains = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];
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

    BrutalObjectBucketStore.prototype._mutableSafeCopy = function (storedObj) {
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

    BrutalObjectBucketStore.prototype.get = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];
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

    BrutalObjectBucketStore.prototype.getAll = function (bucketKey) {
        var retList = [];
        var bucket = this._buckets[bucketKey];

        for (var i = 0, l = bucket.length; i < l; i++) {
            if (bucket[i]) {
                retList.push(this._mutableSafeCopy(bucket[i]));
            }
        }

        return retList;
    };

    BrutalObjectBucketStore.prototype.getLongestNotSeen = function (bucketKey) {
        var longestNotSeenNum = undefined;
        var bucket = this._buckets[bucketKey];

        if (!bucket.length)
            return null;

        var retIndex = 0;

        for (var i = 0, l = bucket.length; i < l; i++) {
            var lastSeen = bucket[i].lastSeen;

            if (longestNotSeenNum === undefined) {
                longestNotSeenNum = lastSeen;
            } else if (lastSeen < longestNotSeenNum) {
                longestNotSeenNum = lastSeen;
                retIndex = i;
            }
        }

        return this._mutableSafeCopy(bucket[retIndex]);
    };

    BrutalObjectBucketStore.prototype.getRandom = function (bucketKey) {
        var bucket = this._buckets[bucketKey];

        if (!bucket.length)
            return null;

        return this._mutableSafeCopy(bucket[Math.floor(Math.random() * bucket.length)]);
    };

    BrutalObjectBucketStore.prototype.remove = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];
        var idToSearch = id.toString('hex');
        var spliceIndex = undefined;

        for (var i = 0, l = bucket.length; i < l; i++) {
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

    BrutalObjectBucketStore.prototype.size = function (bucketKey) {
        return this._buckets[bucketKey].length;
    };
    return BrutalObjectBucketStore;
})();

module.exports = BrutalObjectBucketStore;
//# sourceMappingURL=BrutalObjectBucketStore.js.map
