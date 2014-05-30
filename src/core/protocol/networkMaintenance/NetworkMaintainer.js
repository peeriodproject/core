var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var Id = require('../../topology/Id');

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
    NetworkMaintainer.prototype.joinNetwork = function () {
        var _this = this;
        if (!this._joinedNetwork) {
            this._joinedNetwork = true;

            this._prepopulateBucketRefreshes();

            this._proxyManager.on('contactNodeInformation', function (node) {
                _this._handleBucketAccess(node);
            });

            this._findEntryNodeAndJoin(null);
        }
    };

    NetworkMaintainer.prototype._findEntryNodeAndJoin = function (avoidNode) {
        var _this = this;
        this._nodeSeekerManager.forceFindActiveNode(avoidNode, function (node) {
            _this._findClosestNodesManager.startCycleFor(_this._myIdToSearchFor, [node]);

            _this._findClosestNodesManager.once('foundClosestNodes', function (searchForId, resultingList) {
                if (!resultingList.length) {
                    setImmediate(function () {
                        _this._findEntryNodeAndJoin(node);
                    });
                } else {
                    _this._finalizeEntryWithBucketRefreshes();
                }
            });
        });
    };

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
        }
    };

    NetworkMaintainer.prototype._prepopulateBucketRefreshes = function () {
        var _this = this;
        for (var i = 0; i < this._numberOfBuckets; i++) {
            (function (bucketNumber) {
                _this._setBucketRefreshTimeout(bucketNumber);
            })(i);
        }
    };

    NetworkMaintainer.prototype._setBucketRefreshTimeout = function (bucketNumber) {
        var _this = this;
        if (!this._bucketRefreshes[bucketNumber]) {
            this._bucketRefreshes[bucketNumber] = setTimeout(function () {
                _this._bucketRefreshes[bucketNumber] = 0;
                _this._refreshBucket(bucketNumber);
            }, this._bucketRefreshRateInMs);
        }
    };

    NetworkMaintainer.prototype._clearBucketRefreshTimeout = function (bucketNumber) {
        if (this._bucketRefreshes[bucketNumber]) {
            clearTimeout(this._bucketRefreshes[bucketNumber]);
            this._bucketRefreshes[bucketNumber] = 0;
        }
    };

    NetworkMaintainer.prototype._refreshBucket = function (bucketNumber) {
        var idToSearchFor = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), bucketNumber);

        this.emit('refreshingBucket', bucketNumber);

        this._findClosestNodesManager.startCycleFor(idToSearchFor);
        this._setBucketRefreshTimeout(bucketNumber);

        return idToSearchFor;
    };
    return NetworkMaintainer;
})(events.EventEmitter);

module.exports = NetworkMaintainerInterface;
//# sourceMappingURL=NetworkMaintainer.js.map
