/**
* @class core.topology.Bucket
* @implements core.topology.BucketInterface
*
* @param {core.config.ConfigInterface} config
* @param {number} key
* @param {number} maxBucketSize
* @param {core.topology.BucketStoreInterface} store
* @param {core.topology.ContactNodeFactoryInterface} contactNodeFactory
* @param {Function} onOpenCallback
*/
var Bucket = (function () {
    function Bucket(config, key, maxBucketSize, store, contactNodeFactory, onOpenCallback) {
        /**
        * The internally used config object instance
        *
        * @member {core.config.ConfigInterface} core.topology.Bucket~_config
        */
        this._config = null;
        /**
        * The internally used contact node factory instance
        *
        * @member {core.topology.ContactNodeFactoryInterface} core.topology.Bucket~_contactNodeFactory
        */
        this._contactNodeFactory = null;
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
        this._contactNodeFactory = contactNodeFactory;
        this._keyString = this._key.toString();

        this.open(internalOpenCallback);
    }
    Bucket.prototype.add = function (contact, callback) {
        var internalCallback = callback || function (err, longestNotSeenContact) {
        };

        if (this._store.size(this._keyString) < this._maxBucketSize) {
            this._store.add(this._keyString, contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());

            return process.nextTick(internalCallback.bind(null, null, null));
        } else {
            this.getLongestNotSeen(function (err, contact) {
                internalCallback(new Error('Bucket.add: Cannot add another contact. The Bucket is already full.'), contact);
            });
        }
    };

    Bucket.prototype.close = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.close();

        return process.nextTick(internalCallback.bind(null, null));
    };

    Bucket.prototype.contains = function (contact, callback) {
        return process.nextTick(function () {
            callback(null, this._store.contains(this._keyString, contact.getId().getBuffer()));
        }.bind(this));
    };

    Bucket.prototype.get = function (id, callback) {
        var contact = this._convertToContactNodeInstance(this._store.get(this._keyString, id.getBuffer()));

        return process.nextTick(callback.bind(null, null, contact));
    };

    Bucket.prototype.getAll = function (callback) {
        var storedObjects = this._store.getAll(this._keyString);
        var contacts = [];

        if (storedObjects && storedObjects.length) {
            for (var i = 0, l = storedObjects.length; i < l; i++) {
                contacts.push(this._convertToContactNodeInstance(storedObjects[i]));
            }
        }

        return process.nextTick(callback.bind(null, null, contacts.slice()));
    };

    Bucket.prototype.getLongestNotSeen = function (callback) {
        var contact = this._convertToContactNodeInstance(this._store.getLongestNotSeen(this._keyString));

        return process.nextTick(callback.bind(null, null, contact));
    };

    Bucket.prototype.getRandom = function (callback) {
        var contact = this._convertToContactNodeInstance(this._store.getRandom(this._keyString));

        return process.nextTick(callback.bind(null, null, contact));
    };

    Bucket.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._store.isOpen()));
    };

    Bucket.prototype.open = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.open();
        return process.nextTick(internalCallback.bind(null, null));
    };

    Bucket.prototype.remove = function (id, callback) {
        var internalCallback = callback || function (err) {
        };

        this._store.remove(this._keyString, id.getBuffer());

        return process.nextTick(internalCallback.bind(null, null));
    };

    Bucket.prototype.size = function (callback) {
        return process.nextTick(callback.bind(null, null, this._store.size(this._keyString)));
    };

    Bucket.prototype.update = function (contact, callback) {
        var internalCallback = callback || function (err, longestNotSeenContact) {
        };
        var removed;
        var added;
        var error;
        var longestNotSeenContact;
        var thrown = false;

        var updatedCallback = function () {
            if (error) {
                if (!thrown) {
                    thrown = true;
                    return internalCallback(error, longestNotSeenContact);
                }
            } else if (removed && added) {
                return internalCallback(null, null);
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

                return updatedCallback();
            }
        });

        this.add(contact, function (err, contact) {
            if (callback) {
                if (err) {
                    error = err;
                    longestNotSeenContact = contact;
                } else {
                    added = true;
                }

                return updatedCallback();
            }
        });
    };

    /**
    * Converts a {@link core.topology.ContactNodeObjectInterface} into a {@link core.topology.ContactNodeInterface}
    * by using the {@link core.topology.Bucket~_contactNodeFactory} passed in at construction.
    *
    * @method core.topology.Bucket~_convertToContactNodeInstance
    *
    * @param {core.topology.ContactNodeObjectInterface} contactObject
    * @returns {core.topology.ContactNodeInterface}
    */
    Bucket.prototype._convertToContactNodeInstance = function (contactObject) {
        return contactObject ? this._contactNodeFactory.createFromObject(contactObject) : null;
    };
    return Bucket;
})();

module.exports = Bucket;
//# sourceMappingURL=Bucket.js.map
