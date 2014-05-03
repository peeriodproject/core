/**
* @class core.topology.Bucket
* @implements core.topology.BucketInterface
*/
var Bucket = (function () {
    function Bucket(config, key, store, openCallback) {
        /**
        * The internally used config object instance
        *
        * @private
        * @member {core.config.ConfigInterface} core.topology.Bucket#_config
        */
        this._config = null;
        /**
        * The internally used bucket store instance
        *
        * @private
        * @member {core.topology.BucketStoreInterface} core.topology.Bucket#_store
        */
        this._store = null;
        /**
        * The Key of the bucket
        *
        * @private
        * @member {string} core.topology.Bucket#_key
        */
        this._key = '';
        var internalOpenCallback = openCallback || function (err) {
        };

        this._config = config;
        this._key = key;
        this._store = store;

        this.open(internalOpenCallback);
    }
    Bucket.prototype.add = function (contact, callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.add(this._key, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses(), contact.getPublicKey());

        internalCallback(null);
    };

    Bucket.prototype.close = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.close();
        internalCallback(null);
    };

    Bucket.prototype.contains = function (contact, callback) {
        callback(null, this._store.contains(this._key, contact.getId().getBuffer()));
    };

    Bucket.prototype.get = function (id, callback) {
        callback(null, this._store.get(this._key, id.getBuffer()));
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

        this._store.remove(this._key, id.getBuffer());
        internalCallback(null);
    };

    Bucket.prototype.size = function (callback) {
        callback(null, this._store.size(this._key));
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
