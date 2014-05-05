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
    function RoutingTable(config, id, bucketFactory, bucketStore, options) {
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

        // todo merge opts & defaults
        this._options = ObjectUtils.extend(defaults, options);
        ;

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
            return internalCallback(null);
        }

        this._isOpen = false;

        for (var key in this._buckets) {
            this._buckets[key].close();
        }

        this._buckets = null;
        internalCallback(null);
    };

    RoutingTable.prototype.getContactNode = function (id, callback) {
        var internalCallback = callback || function (err) {
        };
        var bucketKey = this._getBucketKey(id);

        this._buckets[bucketKey].get(id, internalCallback);
    };

    RoutingTable.prototype.isOpen = function (callback) {
        return callback(null, this._isOpen);
    };

    RoutingTable.prototype.open = function (callback) {
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return internalCallback(null);
        }

        this._buckets = {};

        for (var i = 0, k = this._config.get('topology.bitLength'); i < k; i++) {
            this._createBucket(i.toString());
        }

        this._isOpen = true;
        internalCallback(null);
    };

    RoutingTable.prototype.updateContactNode = function (contact, callback) {
        var internalCallback = callback || function (err) {
        };
        var bucketKey = this._getBucketKey(contact.getId());

        this._buckets[bucketKey].update(contact, internalCallback);
    };

    // todo updateId Ideas
    RoutingTable.prototype.updateId = function (id) {
        return;
    };

    /**
    * Creates a bucket with the given key.
    *
    * @method core.topology.RoutingTable~_createBucket
    *
    * @param {string} key
    */
    RoutingTable.prototype._createBucket = function (key) {
        this._buckets[key] = this._bucketFactory.create(this._config, key, this._bucketStore);
    };

    /**
    * Returns the bucket key where the given id should be stored.
    * See {@link core.topology.Id.differsInHighestBit} for more information.
    *
    * @method core.topology.RoutingTable~_getBucketKey
    *
    * @param {core.topology.IdInterface} id
    * @return {string}
    */
    RoutingTable.prototype._getBucketKey = function (id) {
        return this._id.differsInHighestBit(id).toString();
    };
    return RoutingTable;
})();

module.exports = RoutingTable;
//# sourceMappingURL=RoutingTable.js.map
