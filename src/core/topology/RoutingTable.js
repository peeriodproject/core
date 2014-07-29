//import JSONConfig = require('../config/JSONConfig');
var ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
* Creates a routing table with the given number of k-buckets
*
* @class core.topology.RoutingTable
* @implements RoutingTableInterface
*
* @param {config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.topology.IdInterface} id
* @param {core.topology.BucketStoreInterface} bucketStore
*/
var RoutingTable = (function () {
    function RoutingTable(config, appQuitHandler, id, bucketFactory, bucketStore, contactNodeFactory, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * @member {core.topology.BucketFactoryInterface} core.topologyRoutingTable~_bucketFactory
        */
        this._bucketFactory = null;
        /**
        * The internally used bucket store instance.
        *
        * @member {core.topology.BucketStoreInterface} core.topology.RoutingTable~_bucketStore
        */
        this._bucketStore = null;
        /**
        * The internally used list of buckets
        *
        * @member {Array.<topology.BucketInterface>} core.topology.RoutingTable~_buckets
        */
        this._buckets = {};
        /**
        * The internally used contact node factory instance. Usually just for reference and passed through to the Bucket
        *
        * @member {core.topology.ContactNodeFactoryInterface} core.topology.RoutingTable~_contactNodeFactory
        */
        this._contactNodeFactory = null;
        /**
        * The internally used config object instance. Usually just for reference and passed through to the Bucket
        *
        * @member {core.config.ConfigInterface} core.topology.RoutingTable~_config
        */
        this._config = null;
        /**
        * The Id of the node who owns the routing table
        *
        * @member {core.topology.IdInterface} core.topology.RoutingTable~_id
        */
        this._id = null;
        /**
        * A flag indicates whether the store is open or closed
        *
        * @member {boolean} core.topology.RoutingTable~_isOpen
        */
        this._isOpen = false;
        /**
        * The mix of the passed in options object and the defaults
        *
        * @member {core.topology.RoutingTableOptions} core.topology.RoutingTable~_options
        */
        this._options = null;
        var defaults = {
            closeOnProcessExit: true,
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;
        this._id = id;
        this._bucketFactory = bucketFactory;
        this._bucketStore = bucketStore;
        this._contactNodeFactory = contactNodeFactory;

        this._options = ObjectUtils.extend(defaults, options);

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    // todo check bucket.close() return value
    RoutingTable.prototype.close = function (callback) {
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._isOpen = false;
        logger.log('routingTable', 'closed');

        for (var key in this._buckets) {
            this._buckets[key].close();
        }

        this._buckets = null;

        return process.nextTick(internalCallback.bind(null, null));
    };

    RoutingTable.prototype.getAllContactNodesSize = function (callback) {
        if (!this._isOpen) {
            return process.nextTick(callback.bind(null, null, 0));
        }

        var bucketKeys = Object.keys(this._buckets);
        var processed = 0;
        var contactNodeCount = 0;

        var checkCallback = function (err) {
            if (processed === bucketKeys.length) {
                callback(null, contactNodeCount);
            }
        };

        if (bucketKeys.length) {
            for (var i = 0, l = bucketKeys.length; i < l; i++) {
                this._buckets[bucketKeys[i]].size(function (err, size) {
                    processed++;
                    contactNodeCount += size;

                    checkCallback(err);
                });
            }
        }
    };

    RoutingTable.prototype.getClosestContactNodes = function (id, excludeId, callback) {
        var _this = this;
        if (!this._isOpen) {
            return process.nextTick(callback.bind(null, null, []));
        }

        var startBucketKey = this._getBucketKey(id);

        if (!this._isInBucketKeyRange(startBucketKey)) {
            return process.nextTick(callback.bind(null, new Error('RoutingTable.getClosestContactNode: cannot get closest contact nodes for the given Id.'), null));
        }

        var topologyK = this._config.get('topology.k');
        var bucketAmount = this._getBucketAmount();

        var distances = [];
        var distanceMap = {};

        var addContactToDistanceMap = function (contactDistance, contact) {
            distances.push(contactDistance);
            distanceMap[contactDistance.toString('hex')] = contact;
            distances.sort();
        };
        var getContactFromDistanceMap = function (contactDistance) {
            return distanceMap[contactDistance.toString('hex')];
        };

        var crawlBucket = function (crawlBucketKey, crawlReverse, onCrawlEnd) {
            var bucketGetAllCallback = function (err, contacts) {
                if (contacts.length) {
                    for (var i = 0, l = contacts.length; i < l; i++) {
                        var contact = contacts[i];
                        var contactId = contact.getId();

                        // exclude id
                        if (excludeId !== null && contactId.equals(excludeId)) {
                            continue;
                        }

                        if (!distances.length) {
                            var dist = id.distanceTo(contactId);
                            addContactToDistanceMap(dist, contact);
                        } else {
                            var farestDistance = distances[distances.length - 1];
                            var contactDistance = id.distanceTo(contactId);

                            // contact is closer -> adding
                            if (contactDistance < farestDistance) {
                                addContactToDistanceMap(contactDistance, contact);
                            } else if (distances.length < topologyK) {
                                addContactToDistanceMap(contactDistance, contact);
                            }
                        }

                        if (crawlReverse && distances.length === topologyK) {
                            break;
                        }
                    }
                }

                if (!crawlReverse) {
                    if (crawlBucketKey > 0) {
                        crawlBucket(--crawlBucketKey, false, onCrawlEnd);
                    } else {
                        //console.log('reached the first bucket.');
                        if (distances.length < topologyK && startBucketKey < bucketAmount - 1) {
                            //console.log('starting reverse search!');
                            crawlBucket(++startBucketKey, true, onCrawlEnd);
                        } else {
                            //console.log('found nodes! ending...');
                            onCrawlEnd();
                        }
                    }
                } else {
                    if (crawlBucketKey < bucketAmount - 1) {
                        //console.log('crawl the next bucket', distances.length);
                        crawlBucket(++crawlBucketKey, true, onCrawlEnd);
                    } else {
                        //console.log('reached the last bucket ' + (bucketAmount - 1) + '. ending...');
                        onCrawlEnd();
                    }
                }
            };

            //console.log('bucket', crawlBucketKey);
            _this._getBucket(crawlBucketKey).getAll(bucketGetAllCallback);
        };

        crawlBucket(startBucketKey, false, function () {
            var closestContactNodes = [];

            // console.log(distances);
            if (distances.length) {
                for (var i = 0, l = distances.length; i < l; i++) {
                    if (i < topologyK) {
                        closestContactNodes.push(getContactFromDistanceMap(distances[i]));
                    }
                }
            }

            callback(null, closestContactNodes);

            distances = null;
            distanceMap = null;
        });
    };

    RoutingTable.prototype.getContactNode = function (id, callback) {
        if (!this._isOpen) {
            return process.nextTick(callback.bind(null, null, null));
        }

        var bucketKey = this._getBucketKey(id);

        if (this._isInBucketKeyRange(bucketKey)) {
            this._getBucket(bucketKey).get(id, callback);
        } else {
            return process.nextTick(callback.bind(null, new Error('RoutingTable.getContactNode: cannot get the contact node.'), null));
        }
    };

    RoutingTable.prototype.getRandomContactNode = function (callback) {
        var _this = this;
        if (!this._isOpen) {
            return process.nextTick(callback.bind(null, null, null));
        }

        this._getBucketSizes(function (sizes) {
            if (!_this._isOpen) {
                return callback(null, null);
            }

            var bucketKeys = Object.keys(sizes);

            if (!bucketKeys.length) {
                return callback(null, null);
            }

            var randomBucketIndex = Math.floor(Math.random() * bucketKeys.length);
            var randomBucketKey = bucketKeys[randomBucketIndex];

            _this._buckets[randomBucketKey].getRandom(function (err, contact) {
                return callback(null, contact);
            });
        });
    };

    RoutingTable.prototype.getRandomContactNodesFromBucket = function (bucketKey, amount, callback) {
        var _this = this;
        if (!this._isOpen) {
            return process.nextTick(callback.bind(null, null, []));
        }

        if (this._isInBucketKeyRange(bucketKey)) {
            this._getBucket(bucketKey).getAll(function (err, contacts) {
                var contactLength;

                if (err) {
                    return callback(err, null);
                }

                contactLength = contacts.length;

                if (!contactLength || contactLength <= amount) {
                    return callback(null, contacts);
                } else {
                    return callback(null, _this._getRandomizedArray(contacts).slice(0, amount));
                }
            });
        } else {
            return process.nextTick(callback.bind(null, new Error('RoutingTable.getRandomContactNodesFromBucket: The bucket key is out of range.'), null));
        }
    };

    RoutingTable.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    RoutingTable.prototype.open = function (callback) {
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._buckets = {};

        for (var i = 0, k = this._getBucketAmount(); i < k; i++) {
            this._createBucket(i, this._config.get('topology.k'));
        }

        this._isOpen = true;

        logger.log('routingTable', 'opened');

        return process.nextTick(internalCallback.bind(null, null));
    };

    RoutingTable.prototype.replaceContactNode = function (oldContactNode, newContactNode, callback) {
        var _this = this;
        var internalCallback = callback || function (err, longestNotSeenContact) {
        };

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null, null));
        }

        var oldContactNodeId = oldContactNode.getId();
        var newContactNodeId = newContactNode.getId();

        var oldBucketKey = this._getBucketKey(oldContactNodeId);
        var newBucketKey = this._getBucketKey(newContactNodeId);

        if (oldBucketKey !== newBucketKey) {
            logger.error('can not replace nodes in bucket', {
                oldBucketKey: oldBucketKey,
                oldId: oldContactNodeId.toBitString(),
                newBucketKey: newBucketKey,
                newId: newContactNodeId.toBitString()
            });

            return internalCallback(new Error('RoutingTable.replaceContactNode: Cannot replace the given contact nodes. They dont belong to the same Bucket.'), null);
        }

        this._getBucket(newBucketKey).remove(oldContactNodeId, function (err) {
            if (err) {
                return internalCallback(err, null);
            }

            _this._getBucket(newBucketKey).add(newContactNode, function (err, longestNotSeenContact) {
                return internalCallback(err, longestNotSeenContact);
            });
        });
    };

    RoutingTable.prototype.updateContactNode = function (contact, callback) {
        var internalCallback = callback || function (err) {
        };

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null, null));
        }

        var bucketKey = this._getBucketKey(contact.getId());

        if (this._isInBucketKeyRange(bucketKey)) {
            this._getBucket(bucketKey).update(contact, internalCallback);
        } else {
            return process.nextTick(internalCallback.bind(null, new Error('RoutingTable.updateContactNode: cannot update the given contact node.'), null));
        }
    };

    /**
    * Creates a bucket with the given key.
    *
    * @method core.topology.RoutingTable~_createBucket
    *
    * @param {string} bucketKey
    * @param {number} maxBucketSize
    */
    RoutingTable.prototype._createBucket = function (bucketKey, maxBucketSize) {
        this._buckets[this._convertBucketKeyToString(bucketKey)] = this._bucketFactory.create(this._config, bucketKey, maxBucketSize, this._bucketStore, this._contactNodeFactory);
    };

    /**
    * Converts the bucket key from a number to a string so we can use the strinified key to make requests to the database
    *
    * @method core.topology.RoutingTable~_convertBucketKeyToString
    *
    * @param {number} key
    * @returns {string}
    */
    RoutingTable.prototype._convertBucketKeyToString = function (key) {
        return key.toString();
    };

    /**
    * Returns the bucket for the given key. It uses the {@link core.topology.RoutingTable~_convertBucketKeyToString} method
    * for convertion.
    *
    * @method core.topology.RoutingTable~_getBucket
    *
    * @param {number} bucketKey
    * @returns {core.topology.BucketInterface}
    */
    RoutingTable.prototype._getBucket = function (bucketKey) {
        return this._buckets[this._convertBucketKeyToString(bucketKey)];
    };

    /**
    * Returns the amount of buckets the routing table manages.
    *
    * @method core.topology.RoutingTable~_getBucketAmount
    *
    * @returns {number}
    */
    RoutingTable.prototype._getBucketAmount = function () {
        return this._config.get('topology.bitLength');
    };

    /**
    * Returns the bucket key where the given id should be stored.
    * See {@link core.topology.Id.differsInHighestBit} for more information.
    *
    * @method core.topology.RoutingTable~_getBucketKey
    *
    * @param {core.topology.IdInterface} id
    * @return {number}
    */
    RoutingTable.prototype._getBucketKey = function (id) {
        return this._id.differsInHighestBit(id);
    };

    /**
    * Returns a map of bucketKeys and the corresponding size of contact nodes if the bucket. Empty buckets are __excluded__ from the map.
    *
    * @method core.topology.RoutingTable~_getBucketSizes
    *
    * @param {Function} callback The callback that gets called with the map as the first argument after all bucket sizes were collected.
    */
    RoutingTable.prototype._getBucketSizes = function (callback) {
        var _this = this;
        if (!this._buckets) {
            return process.nextTick(callback.bind(null, {}));
        }

        var bucketKeys = Object.keys(this._buckets);
        var bucketKeysLength = bucketKeys.length;

        var returned = 0;
        var sizes = {};
        var checkAndReturn = function () {
            if (returned === bucketKeysLength) {
                return callback(sizes);
            }
        };

        bucketKeys.forEach(function (key) {
            _this._buckets[key].size(function (err, size) {
                size = size || 0;

                if (size) {
                    sizes[key] = size;
                }

                returned++;

                return checkAndReturn();
            });
        });
    };

    /**
    * Returns a shuffled copy of the given array.
    *
    * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    * @see http://sroucheray.org/blog/2009/11/array-sort-should-not-be-used-to-shuffle-an-array/
    *
    * @method core.topology.RoutingTable~_getRandomizedArray
    *
    * @param {Array} input The array to shuffle
    * @returns {Array} the shuffled copy of the input array
    */
    RoutingTable.prototype._getRandomizedArray = function (input) {
        var output = input.slice();
        var i = output.length;
        var j;
        var temp;

        if (i === 0) {
            return;
        }

        while (--i) {
            j = Math.floor(Math.random() * (i + 1));
            temp = output[i];
            output[i] = output[j];
            output[j] = temp;
        }

        return output;
    };

    /*
    * this method will be used whenever node-lmdb updates it's code from nodes SlowBuffer to the new node Buffer class
    */
    //private _getBucketKeyAsString (id:IdInterface):string {
    //	return    this._convertBucketKeyToString(this._getBucketKey(id));
    //}
    /**
    * Returns `true` if the given bucket key fits into the range `0 <= bucketKey < topology.bitLength`
    *
    * @method core.topology.RoutingTable~_isInBucketKeyRange
    *
    * @param {number} bucketKey
    * @return {boolean}
    */
    RoutingTable.prototype._isInBucketKeyRange = function (bucketKey) {
        return (0 <= bucketKey && bucketKey < this._getBucketAmount());
    };
    return RoutingTable;
})();

module.exports = RoutingTable;
//# sourceMappingURL=RoutingTable.js.map
