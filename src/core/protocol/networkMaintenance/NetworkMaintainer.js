var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var Id = require('../../topology/Id');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
* NetworkMaintainerInterface implementation.
*
* @class core.protocol.networkMaintenance.NetworkMaintainer
* @extends NodeJS.EventEmitter
* @implements core.protocol.networkMaintenance.NetworkMaintainerInterface
*
* @param {core.config.ConfigInterface} topologyConfig Topology configuration object
* @param {core.config.ConfigInterface} protocolConfig Protocol configuration object
* @param {core.topology.MyNodeInterface} myNode MyNode instance.
* @param {core.protocol.nodeDiscovery.NodeSeekerManagerInterface} A node seeker manager.
* @param {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} FindClosestNodesManager instance.
* @oaram {core.protocol.proxy.ProxyManagerInterface} A working ProxyManager instance.
*/
var NetworkMaintainer = (function (_super) {
    __extends(NetworkMaintainer, _super);
    function NetworkMaintainer(topologyConfig, protocolConfig, myNode, nodeSeekerManager, findClosestNodesManager, proxyManager) {
        _super.call(this);
        /**
        * Stores the timeouts to a bucket by its index.
        *
        * @member {Array<number>} core.protocol.networkMaintenance.NetworkMaintainer~_bucketRefreshes
        */
        this._bucketRefreshes = [];
        /**
        * Indicates in ms the time after which an otherwise unaccessed bucket must be refreshed.
        *
        * @member {Array<number>} core.protocol.networkMaintenance.NetworkMaintainer~_bucketRefreshRateInMs
        */
        this._bucketRefreshRateInMs = 0;
        /**
        * A FindClosestNodesManager
        *
        * @member {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} core.protocol.networkMaintenance.NetworkMaintainer~_findClosestNodesManager
        */
        this._findClosestNodesManager = null;
        /**
        * Indicates whether `joinNetwork` has been called or not.
        *
        * @member {boolean} core.protocol.networkMaintenance.NetworkMaintainer~_joinedNetwork
        */
        this._joinedNetwork = false;
        /**
        * The ID which differs in 0th bit to MyNode's ID.
        *
        * @member {core.topology.IdInterface} core.protocol.networkMaintenance.NetworkMaintainer~_myIdToSearchFor
        */
        this._myIdToSearchFor = null;
        /**
        * My Node.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.networkMaintenance.NetworkMaintainer~_myNode
        */
        this._myNode = null;
        /**
        * The bucket index of the nearest active neighbor.
        *
        * @member {number} core.protocol.networkMaintenance.NetworkMaintainer~_nearestAccessedBucket
        */
        this._nearestAccessedBucket = -1;
        /**
        * A NodeSeekerManager.
        *
        * @member {core.protocol.nodeDiscovery.NodeSeekerManagerInterface} core.protocol.networkMaintenance.NetworkMaintainer~_nodeSeekerManager
        */
        this._nodeSeekerManager = null;
        /**
        * The number of buckets in the routing table. Populated by config.
        *
        * @member {number} core.protocol.networkMaintenance.NetworkMaintainer~_numberOfBuckets
        */
        this._numberOfBuckets = 0;
        /**
        * A ProxyManager.
        *
        * @member {core.protocol.proxy.ProxyManagerInterface} core.protocol.networkMaintenance.NetworkMaintainer~_proxyManager
        */
        this._proxyManager = null;

        this._bucketRefreshRateInMs = protocolConfig.get('protocol.networkMaintenance.bucketRefreshRateInSeconds') * 1000;
        this._numberOfBuckets = topologyConfig.get('topology.bitLength');

        this._myNode = myNode;
        this._nodeSeekerManager = nodeSeekerManager;
        this._findClosestNodesManager = findClosestNodesManager;
        this._proxyManager = proxyManager;

        this._myIdToSearchFor = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), 0);
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    NetworkMaintainer.prototype.getJoinedNetwork = function () {
        return this._joinedNetwork;
    };

    NetworkMaintainer.prototype.getNearestAccessedBucket = function () {
        return this._nearestAccessedBucket;
    };

    NetworkMaintainer.prototype.getBucketRefreshes = function () {
        return this._bucketRefreshes;
    };

    NetworkMaintainer.prototype.getMyIdToSearchFor = function () {
        return this._myIdToSearchFor;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    NetworkMaintainer.prototype.joinNetwork = function () {
        var _this = this;
        if (!this._joinedNetwork) {
            this._joinedNetwork = true;

            this._prepopulateBucketRefreshes();

            logger.info('Joining the network');

            this._proxyManager.on('contactNodeInformation', function (node) {
                _this._handleBucketAccess(node);
            });

            this._findEntryNodeAndJoin(null);
        }
    };

    /**
    * Clears the refresh timeout (if existing) of a bucket by its index
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_clearBucketRefreshTimeout
    *
    * @param {number} bucketNumber The bucket index
    */
    NetworkMaintainer.prototype._clearBucketRefreshTimeout = function (bucketNumber) {
        if (this._bucketRefreshes[bucketNumber]) {
            global.clearTimeout(this._bucketRefreshes[bucketNumber]);
            this._bucketRefreshes[bucketNumber] = 0;
        }
    };

    /**
    * Issues FIND_CLOSEST_NODES cycles on the buckets further away than the closest neighbor.
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_finalizeEntryWithBucketRefreshes
    */
    NetworkMaintainer.prototype._finalizeEntryWithBucketRefreshes = function () {
        var _this = this;
        var queriedIds = [];

        var checkAndEmitFinal = function (searchForId) {
            var searchForHex = searchForId.toHexString();
            var index = queriedIds.indexOf(searchForHex);
            if (index >= 0) {
                queriedIds.splice(index, 1);
                if (queriedIds.length === 0) {
                    _this._findClosestNodesManager.removeListener('foundClosestNodes', checkAndEmitFinal);
                    _this.emit('joinedNetwork');
                }
            }
        };

        if (this._nearestAccessedBucket + 1 < this._numberOfBuckets) {
            this._findClosestNodesManager.on('foundClosestNodes', checkAndEmitFinal);

            for (var i = this._nearestAccessedBucket + 1; i < this._numberOfBuckets; i++) {
                queriedIds.push(this._refreshBucket(i).toHexString());
            }
        } else {
            this.emit('joinedNetwork');
        }
    };

    /**
    * Force finds an initial contact node and sends a FIND_CLOSEST_NODES query to it containing an ID merely differing
    * in the 0th bit to MyNode's ID.
    * If the query returns no additional nodes, another initial contact node is searched for and the process repeats,
    * otherwise the node entry process is finalized by issuing bucket refreshes.
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_findEntryNodeAndJoin
    *
    * @param {core.topology.ContactNodeInterface} avoidNode Node to avoid when force finding an initial contact.
    */
    NetworkMaintainer.prototype._findEntryNodeAndJoin = function (avoidNode) {
        var _this = this;
        this._nodeSeekerManager.forceFindActiveNode(avoidNode, function (node) {
            logger.info('Found an entry node, starting search for own id...', { with: node.getId().toHexString() });

            _this._findClosestNodesManager.startCycleFor(_this._myIdToSearchFor, [node]);

            _this._findClosestNodesManager.once('foundClosestNodes', function (searchForId, resultingList) {
                //logger.info('Find closest nodes cycle finished', {for: searchForId.toHexString(), resultLen: resultingList.length});
                if (!resultingList.length) {
                    logger.info('Resulting list is empty, trying to find another node.');
                    setImmediate(function () {
                        _this._findEntryNodeAndJoin(node);
                    });
                } else {
                    logger.info('The initial contact query is done.', { resultLen: resultingList.length });
                    _this.emit('initialContactQueryCompleted');
                    _this._finalizeEntryWithBucketRefreshes();
                }
            });
        });
    };

    /**
    * The function gets called as soon as the proxy manager emits a 'contactNodeInformation' event, i.e. information to
    * an active node is seen.
    * The timeout of the bucket which the node would be assigned to is refreshed.
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_handleBucketAccess
    *
    * @param {core.topology.ContactNodeInterface} node The seen contact node.
    */
    NetworkMaintainer.prototype._handleBucketAccess = function (node) {
        var bucketNumber = this._myNode.getId().differsInHighestBit(node.getId());

        if (bucketNumber >= 0) {
            if (this._nearestAccessedBucket === -1 || this._nearestAccessedBucket > bucketNumber) {
                this._nearestAccessedBucket = bucketNumber;
            }

            this._clearBucketRefreshTimeout(bucketNumber);
            this._setBucketRefreshTimeout(bucketNumber);
        }
    };

    /**
    * Iterates over the overall number of buckets and sets a refresh timeout on them.
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_prepopulateBucketRefreshes
    */
    NetworkMaintainer.prototype._prepopulateBucketRefreshes = function () {
        var _this = this;
        for (var i = 0; i < this._numberOfBuckets; i++) {
            (function (bucketNumber) {
                _this._setBucketRefreshTimeout(bucketNumber);
            })(i);
        }
    };

    /**
    * Refreshes a bucket by issuing a FIND_CLOSEST_NODES cycle on a random ID which would be assigned to the said bucket.
    * Emits a `refreshingBucket` event with the bucket index as argument.
    * Renews the bucket refresh timeout.
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_refreshBucket
    *
    * @param {number} bucketNumber The index of the bucket to refresh
    * @returns {IdInterface} The search for ID of the resulting FIND_CLOSEST_NODES cycle.
    */
    NetworkMaintainer.prototype._refreshBucket = function (bucketNumber) {
        var idToSearchFor = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), bucketNumber);

        this.emit('refreshingBucket', bucketNumber);

        this._findClosestNodesManager.startCycleFor(idToSearchFor);
        this._setBucketRefreshTimeout(bucketNumber);

        return idToSearchFor;
    };

    /**
    * Sets a bucket refresh timeout by a bucket index.
    *
    * @method core.protocol.networkMaintenance.NetworkMaintainer~_setBucketRefreshTimeout
    *
    * @param {number} bucketNumber Index of the bucket to set the timeout on.
    */
    NetworkMaintainer.prototype._setBucketRefreshTimeout = function (bucketNumber) {
        var _this = this;
        if (!this._bucketRefreshes[bucketNumber]) {
            this._bucketRefreshes[bucketNumber] = global.setTimeout(function () {
                _this._bucketRefreshes[bucketNumber] = 0;
                _this._refreshBucket(bucketNumber);
            }, this._bucketRefreshRateInMs);
        }
    };
    return NetworkMaintainer;
})(events.EventEmitter);

module.exports = NetworkMaintainer;
//# sourceMappingURL=NetworkMaintainer.js.map
