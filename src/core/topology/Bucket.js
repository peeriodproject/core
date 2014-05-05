/**
* @class core.topology.Bucket
* @implements core.topology.BucketInterface
*/
var Bucket = (function () {
    function Bucket(config, key, maxBucketSize, store, onOpenCallback) {
        /**
        * The internally used config object instance
        *
        * @member {core.config.ConfigInterface} core.topology.Bucket~_config
        */
        this._config = null;
        /**
        * The internally used bucket store instance
        *
        * @member {core.topology.BucketStoreInterface} core.topology.Bucket~_store
        */
        this._store = null;
        /**
        * The Key of the bucket
        *
        * @member {string} core.topology.Bucket~_key
        */
        this._key = -1;
        /**
        * The key of the bucket as string
        *
        * @member {string} core.topology.Bucket~_keyString
        */
        this._keyString = '';
        /**
        * The maximum amount of contact nodes the bucket should handle.
        *
        * @member {string} core.topology.Bucket~_maxBucketSize
        */
        this._maxBucketSize = -1;
        var internalOpenCallback = onOpenCallback || function (err) {
        };

        this._config = config;
        this._key = key;
        this._maxBucketSize = maxBucketSize;
        this._store = store;
        this._keyString = this._key.toString();

        this.open(internalOpenCallback);
    }
    Bucket.prototype.add = function (contact, callback) {
        var internalCallback = callback || function (err) {
        };

        if (this._store.size(this._keyString) < this._maxBucketSize) {
            this._store.add(this._keyString, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());

            internalCallback(null);
        } else {
            internalCallback(new Error('Bucket.add: Cannot add another contact. The Bucket is already full.'));
        }
    };

    Bucket.prototype.close = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.close();
        internalCallback(null);
    };

    Bucket.prototype.contains = function (contact, callback) {
        callback(null, this._store.contains(this._keyString, contact.getId().getBuffer()));
    };

    Bucket.prototype.get = function (id, callback) {
        callback(null, this._store.get(this._keyString, id.getBuffer()));
    };

    Bucket.prototype.getAll = function (callback) {
        callback(null, this._store.getAll(this._keyString));
    };

    Bucket.prototype.isOpen = function (callback) {
        callback(null, this._store.isOpen());
    };

    Bucket.prototype.open = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.open();
        internalCallback(null);
    };

    Bucket.prototype.remove = function (id, callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.remove(this._keyString, id.getBuffer());
        internalCallback(null);
    };

    Bucket.prototype.size = function (callback) {
        callback(null, this._store.size(this._keyString));
    };

    Bucket.prototype.update = function (contact, callback) {
        var internalCallback = callback || function (err) {
        };
        var removed;
        var added;
        var error;

        var updatedCallback = function () {
            if (error) {
                internalCallback(error);
            } else if (removed && added) {
                internalCallback(null);
            }
        };

        // todo Benchmark: always replace vs. check nodeaddresses and update
        this.remove(contact.getId(), function (err) {
            if (callback) {
                if (err) {
                    error = err;
                } else {
                    removed = true;
                }

                updatedCallback();
            }
        });

        this.add(contact, function (err) {
            if (callback) {
                if (err) {
                    error = err;
                } else {
                    added = true;
                }

                updatedCallback();
            }
        });
    };
    return Bucket;
})();

module.exports = Bucket;
//# sourceMappingURL=Bucket.js.map
