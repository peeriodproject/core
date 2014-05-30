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
        this._myNode = null;
        this._nodeSeekerManager = null;
        this._findClosestNodesManager = null;
        this._proxyManager = null;
        this._bucketRefreshRateInMs = 0;
        this._numberOfBuckets = 0;
        this._myIdToSearchFor = null;
        this._bucketRefreshes = [];
        this._joinedNetwork = false;

        this._bucketRefreshRateInMs = protocolConfig.get('protocol.networkMaintenance.bucketRefreshRateInSeconds') * 1000;
        this._numberOfBuckets = topologyConfig.get('topology.bitLength');

        this._myNode = myNode;
        this._nodeSeekerManager = nodeSeekerManager;
        this._findClosestNodesManager = findClosestNodesManager;
        this._proxyManager = proxyManager;

        this._myIdToSearchFor = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), 0);
    }
    NetworkMaintainer.prototype.joinNetwork = function () {
        if (!this._joinedNetwork) {
            this._joinedNetwork = true;

            this._prepopulateBucketRefreshes();
        }
    };

    NetworkMaintainer.prototype._prepopulateBucketRefreshes = function () {
        var _this = this;
        for (var i = 0; i < this._numberOfBuckets; i++) {
            (function (bucketNumber) {
                _this._bucketRefreshes[bucketNumber] = setTimeout(function () {
                    _this._refreshBucket(bucketNumber);
                }, _this._bucketRefreshRateInMs);
            })(i);
        }
    };

    NetworkMaintainer.prototype._refreshBucket = function (bucketNumber) {
        var idToSearchFor = Id.getRandomIdDifferingInHighestBit(this._myNode.getId(), bucketNumber);

        this.emit('refreshingBucket', bucketNumber);

        this._findClosestNodesManager.startCycleFor(idToSearchFor);
    };
    return NetworkMaintainer;
})(events.EventEmitter);

module.exports = NetworkMaintainerInterface;
//# sourceMappingURL=NetworkMaintainer.js.map
