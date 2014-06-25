var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

var BroadcastManager = (function (_super) {
    __extends(BroadcastManager, _super);
    function BroadcastManager(topologyConfig, protocolConfig, myNode, protocolConnectionManager, proxyManager, routingTable, readableBroadcastMessageFactory, writableBroadcastMessageFactory) {
        var _this = this;
        _super.call(this);
        this._numberOfBuckets = 0;
        this._alpha = 0;
        this._broadcastLifetimeInMs = 0;
        this._proxyManager = null;
        this._routingTable = null;
        this._protocolConnectionManager = null;
        this._readableBroadcastMessageFactory = null;
        this._writableBroadcastMessageFactory = null;
        this._myNode = null;
        this._knownBroadcastIds = [];

        this._numberOfBuckets = topologyConfig.get('topology.bitLength');
        this._alpha = topologyConfig.get('topology.alpha');
        this._myNode = myNode;
        this._broadcastLifetimeInMs = protocolConfig.get('protocol.broadcast.broadcastLifetimeInSeconds');
        this._proxyManager = proxyManager;
        this._protocolConnectionManager = protocolConnectionManager;
        this._routingTable = routingTable;
        this._readableBroadcastMessageFactory = readableBroadcastMessageFactory;
        this._writableBroadcastMessageFactory = writableBroadcastMessageFactory;

        this._proxyManager.on('message', function (message) {
            if (message.getMessageType() === 'BROADCAST') {
                _this._onBroadcastMessage(message);
            }
        });
    }
    BroadcastManager.prototype.initBroadcast = function (payload) {
        var _this = this;
        var broadcastId = crypto.pseudoRandomBytes(8).toString('hex');
        var broadcastMsg = this._writableBroadcastMessageFactory.constructPayload(broadcastId, payload);

        this._knownBroadcastIds.push(broadcastId);

        global.setTimeout(function () {
            _this._removeFromKnownBroadcasts(broadcastId);
        }, this._broadcastLifetimeInMs);

        this._propagateMessageThroughBuckets(broadcastMsg, this._numberOfBuckets - 1);
    };

    BroadcastManager.prototype._onBroadcastMessage = function (msg) {
        var _this = this;
        var message = this._readableBroadcastMessageFactory.create(msg.getPayload());

        if (message) {
            var timeElapsed = Date.now() - message.getTimestamp();
            var broadcastId = message.getBroadcastId();

            if (timeElapsed < this._broadcastLifetimeInMs && this._knownBroadcastIds.indexOf(broadcastId) > -1) {
                this.emit('receivedBroadcast', message.getPayload());

                var differsInBit = msg.getSender().getId().differsInHighestBit(this._myNode.getId());

                this._knownBroadcastIds.push(broadcastId);

                global.setTimeout(function () {
                    _this._removeFromKnownBroadcasts(broadcastId);
                }, this._broadcastLifetimeInMs - timeElapsed);

                this._propagateMessageThroughBuckets(msg.getPayload(), differsInBit - 1);
            }
        }
    };

    BroadcastManager.prototype._removeFromKnownBroadcasts = function (broadcastId) {
        var index = this._knownBroadcastIds.indexOf(broadcastId);
        if (index > -1) {
            this._knownBroadcastIds.splice(index, 1);
        }
    };

    BroadcastManager.prototype._propagateMessageThroughBuckets = function (message, bucketStart) {
        var _this = this;
        for (var i = bucketStart; i >= 0; i--) {
            this._routingTable.getRandomContactNodesFromBucket(i, this._alpha, function (err, contactNodes) {
                if (!err && contactNodes.length) {
                    _this._sendMessageToNodes(message, contactNodes);
                }
            });
        }
    };

    BroadcastManager.prototype._sendMessageToNodes = function (message, nodes) {
        for (var i = 0, l = nodes.length; i < l; i++) {
            this._protocolConnectionManager.writeMessageTo(nodes[i], 'BROADCAST', message);
        }
    };
    return BroadcastManager;
})(events.EventEmitter);

module.exports = BroadcastManager;
//# sourceMappingURL=BroadcastManager.js.map
