var BrutalObjectBucketStore = (function () {
    function BrutalObjectBucketStore() {
        this._buckets = {};
        this._open = true;
    }
    BrutalObjectBucketStore.prototype.close = function () {
        this._open = false;
    };

    BrutalObjectBucketStore.prototype.isOpen = function () {
        return this._open;
    };

    BrutalObjectBucketStore.prototype.open = function () {
        this._open = true;
    };

    BrutalObjectBucketStore.prototype._add = function (bucketKey, id, lastSeen, addresses) {
        if (!this._buckets[bucketKey]) {
            this._buckets[bucketKey] = [];
        }

        var addressArray = [];

        for (var i = 0, l = addresses.length; i < l; i++) {
            var address = addresses[i];
            addressArray.push({
                _ip: address.getIp(),
                _port: address.getPort(),
                _isV4: address.isIPv4(),
                _isV6: address.isIPv6()
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

    BrutalObjectBucketStore.prototype._mutableSafeCopy = function (storedObj) {
        var obj = {
            addresses: [],
            id: (new Buffer(storedObj.id, 'hex')).toJSON(),
            lastSeen: storedObj.lastSeen
        };

        var addresses = storedObj.addresses;

        for (var i = 0, l = addresses.length; i < l; i++) {
            var address = addresses[i];
            obj.addresses.push({ _ip: address._ip, _port: address._port, _isV4: address._isV4, _isV6: address._isV6 });
        }

        return obj;
    };

    BrutalObjectBucketStore.prototype.get = function (bucketKey, id) {
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

    BrutalObjectBucketStore.prototype.getAll = function (bucketKey) {
        var retList = [];
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return retList;

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

        if (!(bucket && bucket.length))
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

        if (!(bucket && bucket.length))
            return null;

        return this._mutableSafeCopy(bucket[Math.floor(Math.random() * bucket.length)]);
    };

    BrutalObjectBucketStore.prototype.remove = function (bucketKey, id) {
        var bucket = this._buckets[bucketKey];

        if (!bucket)
            return true;

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
        if (!this._buckets[bucketKey])
            return 0;

        return this._buckets[bucketKey].length;
    };
    return BrutalObjectBucketStore;
})();

module.exports = BrutalObjectBucketStore;
//# sourceMappingURL=BrutalObjectBucketStore.js.map
