//import JSONConfig = require('../config/JSONConfig');
var ObjectUtils = require('../utils/ObjectUtils');

/**
* Creates a routing table with the given number of k-buckets
*
* @class core.topology.RoutingTable
* @implements RoutingTableInterface
*
* @param {config.ConfigInterface} config
* @param {core.topology.IdInterface} id
* @param {core.topology.BucketStoreInterface} bucketStore
*/
var RoutingTable = (function () {
    function RoutingTable(config, id, bucketFactory, bucketStore, contactNodeFactory, options) {
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
        * A flag indicates weather the store is open or closed
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
            process.on('exit', function () {
                _this.close(_this._options.onCloseCallback);
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

        for (var key in this._buckets) {
            this._buckets[key].close();
        }

        this._buckets = null;

        return process.nextTick(internalCallback.bind(null, null));
    };

    RoutingTable.prototype.getClosestContactNodes = function (id, excludeId, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };
        var startBucketKey = this._getBucketKey(id);

        if (!this._isInBucketKeyRange(startBucketKey)) {
            return process.nextTick(internalCallback.bind(null, new Error('RoutingTable.getClosestContactNode: cannot get closest contact nodes for the given Id.'), null));
        }

        var topologyK = this._config.get('topology.k');
        var bitLength = this._config.get('topology.bitLength');

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
                    for (var i in contacts) {
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
                        if (distances.length < topologyK && startBucketKey < bitLength - 1) {
                            //console.log('starting reverse search!');
                            crawlBucket(++startBucketKey, true, onCrawlEnd);
                        } else {
                            //console.log('found nodes! ending...');
                            onCrawlEnd();
                        }
                    }
                } else {
                    if (crawlBucketKey < bitLength - 1) {
                        //console.log('crawl the next bucket', distances.length);
                        crawlBucket(++crawlBucketKey, true, onCrawlEnd);
                    } else {
                        //console.log('reached the last bucket ' + (bitLength - 1) + '. ending...');
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
                for (var i in distances) {
                    if (i < topologyK) {
                        closestContactNodes.push(getContactFromDistanceMap(distances[i]));
                    }
                }
            }

            internalCallback(null, closestContactNodes);

            distances = null;
            distanceMap = null;
        });
    };

    RoutingTable.prototype.getContactNode = function (id, callback) {
        var internalCallback = callback || function (err) {
        };
        var bucketKey = this._getBucketKey(id);

        if (this._isInBucketKeyRange(bucketKey)) {
            this._getBucket(bucketKey).get(id, internalCallback);
        } else {
            return process.nextTick(internalCallback.bind(null, new Error('RoutingTable.getContactNode: cannot get the contact node.'), null));
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

        for (var i = 0, k = this._config.get('topology.bitLength'); i < k; i++) {
            this._createBucket(i, this._config.get('topology.k'));
        }

        this._isOpen = true;

        return process.nextTick(internalCallback.bind(null, null));
    };

    RoutingTable.prototype.updateContactNode = function (contact, callback) {
        var internalCallback = callback || function (err) {
        };
        var bucketKey = this._getBucketKey(contact.getId());

        if (this._isInBucketKeyRange(bucketKey)) {
            this._getBucket(bucketKey).update(contact, internalCallback);
        } else {
            return process.nextTick(internalCallback.bind(null, new Error('RoutingTable.updateContactNode: cannot update the given contact node.')));
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
        this._buckets[this._getBucketKeyString(bucketKey)] = this._bucketFactory.create(this._config, bucketKey, maxBucketSize, this._bucketStore, this._contactNodeFactory);
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

    /*
    * this method will be used whenever node-lmdb updates it's code from nodes SlowBuffer to the new node Buffer class
    private _getBucketKeyAsString (id:IdInterface):string {
    return    this._getBucketKeyString(this._getBucketKey(id));
    }*/
    RoutingTable.prototype._getBucketKeyString = function (key) {
        return key.toString();
    };

    RoutingTable.prototype._getBucket = function (bucketKey) {
        return this._buckets[this._getBucketKeyString(bucketKey)];
    };

    /**
    * Returns `true` if the given bucket key fits into the range `0 <= bucketKey < topology.bitLength`
    *
    * @method core.topology.RoutingTable~_isInBucketKeyRange
    *
    * @param {number} bucketKey
    * @return {boolean}
    */
    RoutingTable.prototype._isInBucketKeyRange = function (bucketKey) {
        return (0 <= bucketKey && bucketKey < this._config.get('topology.bitLength'));
    };
    return RoutingTable;
})();

module.exports = RoutingTable;
//# sourceMappingURL=RoutingTable.js.map
