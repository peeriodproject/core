var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

/**
* BroadcastManagerInterface implementation.
*
* @class core.protocol.broadcast.BroadcastManager
* @extends events.EventEmitter
* @implements BroadcastManagerInterface
*
* @param {core.config.ConfigInterface} topologyConfig Configuration for alpha and bit length.
* @param {core.config.ConfigInterface} protocolConfig Configuration for broadcast
* @param {core.topology.MyNodeInterface} myNode My node instance.
* @param {core.protocol.ProtocolConnectionManagerInterface} protocolConnectionManager Working protocol connection manager instance.
* @param {core.protocol.ProxyManagerInterface} proxyManager Working proxy manager instance to listen on the 'message' event.
* @param {core.topology.RoutingTableInterface} routingTable Routing table.
* @param {core.protocol.broadcast.BroadcastReadableMessageFactoryInterface} readableBroadcastMessageFactory Factory for reading broadcast messages.
* @param {core.protocol.broadcast.BroadcastWritableMessageFactoryInterface} writableBroadcastMessageFactory Factory for writing broadcast messages.
*/
var BroadcastManager = (function (_super) {
    __extends(BroadcastManager, _super);
    function BroadcastManager(topologyConfig, protocolConfig, myNode, protocolConnectionManager, proxyManager, routingTable, readableBroadcastMessageFactory, writableBroadcastMessageFactory) {
        var _this = this;
        _super.call(this);
        /**
        * The number of nodes to choose from each bucket when broadcasting.
        *
        * @member {number} core.protocol.broadcast.BroadcastManager~_alpha
        */
        this._alpha = 0;
        /**
        * Number of milliseconds a broadcast is valid, i.e. will be propagated on.
        *
        * @member {number} core.protocol.broadcast.BroadcastManager~_broadcastLifetimeInMs
        */
        this._broadcastLifetimeInMs = 0;
        /**
        * Stores the IDs of broadcasts which will be ignored in every case. This list is never emptied.
        *
        * @member {Array<string>} core.protocol.broadcast.BroadcastManager~_ignoreBroadcastIds
        */
        this._ignoreBroadcastIds = [];
        /**
        * Stores the IDs of broadcasts already received (and thus need not be sent on)
        *
        * @member {Array<string>} core.protocol.broadcast.BroadcastManager~_knownBroadcastIds
        */
        this._knownBroadcastIds = [];
        /**
        * My node.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.broadcast.BroadcastManager~_myNode
        */
        this._myNode = null;
        /**
        * The total number of buckets in the routing table.
        *
        * @member {number} core.protocol.broadcast.BroadcastManager~_numberOfBuckets
        */
        this._numberOfBuckets = 0;
        /**
        * Protocol connection manager instance.
        *
        * @member {core.protocol.ProtocolConnectionManagerInterface} core.protocol.broadcast.BroadcastManager~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * Proxy manager instance.
        *
        * @member {core.protocol.ProxyManagerInterface} core.protocol.broadcast.BroadcastManager~_proxyManager
        */
        this._proxyManager = null;
        /**
        * Factory for reading broadcast messages.
        *
        * @member {core.protocol.broadcast.BroadcastReadableMessageFactoryInterface} core.protocol.broadcast.BroadcastManager~_readableBroadcastMessageFactory
        */
        this._readableBroadcastMessageFactory = null;
        /**
        * Routing table instance.
        *
        * @member {core.topology.RoutingTableInterface} core.protocol.broadcast.BroadcastManager~_routingTable
        */
        this._routingTable = null;
        /**
        * Factory for writing broadcast messages.
        *
        * @member {core.protocol.broadcast.BroadcastWritableMessageFactoryInterface} core.protocol.broadcast.BroadcastManager~_writableBroadcastMessageFactory
        */
        this._writableBroadcastMessageFactory = null;

        this._numberOfBuckets = topologyConfig.get('topology.bitLength');
        this._alpha = topologyConfig.get('topology.alpha');
        this._myNode = myNode;
        this._broadcastLifetimeInMs = protocolConfig.get('protocol.broadcast.broadcastLifetimeInSeconds') * 1000;
        this._proxyManager = proxyManager;
        this._protocolConnectionManager = protocolConnectionManager;
        this._routingTable = routingTable;
        this._readableBroadcastMessageFactory = readableBroadcastMessageFactory;
        this._writableBroadcastMessageFactory = writableBroadcastMessageFactory;

        this._proxyManager.on('message', function (message) {
            if (message.getMessageType().indexOf('BROADCAST') === 0) {
                _this._onBroadcastMessage(message);
            }
        });
    }
    /**
    * BEGIN TESTING PURPOSES
    */
    BroadcastManager.prototype.getKnownBroadcastIds = function () {
        return this._knownBroadcastIds;
    };

    /**
    * END TESTING PURPOSES
    */
    BroadcastManager.prototype.ignoreBroadcastId = function (broadcastId) {
        this._ignoreBroadcastIds.push(broadcastId);
    };

    BroadcastManager.prototype.initBroadcast = function (messageType, payload, broadcastId) {
        var _this = this;
        var broadcastId = broadcastId || crypto.pseudoRandomBytes(8).toString('hex');
        var broadcastMsg = this._writableBroadcastMessageFactory.constructPayload(broadcastId, payload);

        this._knownBroadcastIds.push(broadcastId);

        global.setTimeout(function () {
            _this._removeFromKnownBroadcasts(broadcastId);
        }, this._broadcastLifetimeInMs);

        this._propagateMessageThroughBuckets(messageType, broadcastMsg, this._numberOfBuckets - 1);
    };

    /**
    * Function that gets called when a new broadcast message comes in.
    * See {@link core.protocol.broadcast.BroadcastManagerInterface} for detailed information on the decision on proceedings.
    *
    * @method core.protocol.broadcast.BroadcastManager~_onBroadcastMessage
    *
    * @param {core.protocol.messages.ReadableMessageInterface} msg The received message with the BROADCAST message as payload.
    */
    BroadcastManager.prototype._onBroadcastMessage = function (msg) {
        var _this = this;
        var message = this._readableBroadcastMessageFactory.create(msg.getPayload());

        if (message) {
            var timeElapsed = Date.now() - message.getTimestamp();
            var broadcastId = message.getBroadcastId();

            if (timeElapsed < this._broadcastLifetimeInMs && this._knownBroadcastIds.indexOf(broadcastId) === -1 && this._ignoreBroadcastIds.indexOf(broadcastId) === -1) {
                this.emit(msg.getMessageType(), message.getPayload(), message.getBroadcastId());

                var differsInBit = msg.getSender().getId().differsInHighestBit(this._myNode.getId());

                this._knownBroadcastIds.push(broadcastId);

                global.setTimeout(function () {
                    _this._removeFromKnownBroadcasts(broadcastId);
                }, this._broadcastLifetimeInMs - timeElapsed);

                this._propagateMessageThroughBuckets(msg.getMessageType(), msg.getPayload(), differsInBit - 1);
            }
        }
    };

    /**
    * Sends a BROADCAST message to alpha random nodes from each bucket with an index less or equal than the index provided.
    *
    * @method core.protocol.broadcast.BroadcastManager~_propagateMessageThroughBuckets
    *
    * @param {string} messageType the broadcast message type
    * @param {Buffer} message The payload of the whole BROADCAST message
    * @param {number} bucketStart The bucket index to start decrementing from.
    */
    BroadcastManager.prototype._propagateMessageThroughBuckets = function (messageType, message, bucketStart) {
        var _this = this;
        for (var i = bucketStart; i >= 0; i--) {
            this._routingTable.getRandomContactNodesFromBucket(i, this._alpha, function (err, contactNodes) {
                if (!err && contactNodes.length) {
                    _this._sendMessageToNodes(messageType, message, contactNodes);
                }
            });
        }
    };

    /**
    * Removes the given broadcast ID from the know broadcast list (if present)
    *
    * @method core.protocol.broadcast.BroadcastManager~_removeFromKnownBroadcasts
    *
    * @param {string} broadcastId The broadcast ID to remove.
    */
    BroadcastManager.prototype._removeFromKnownBroadcasts = function (broadcastId) {
        var index = this._knownBroadcastIds.indexOf(broadcastId);
        if (index > -1) {
            this._knownBroadcastIds.splice(index, 1);
        }
    };

    /**
    * Sends a BROADCAST message to the provided nodes.
    *
    * @method core.protocol.broadcast.BroadcastManager~_sendMessageToNodes
    *
    * @param {string} messageType The broadcast message type.
    * @param {Buffer} message The payload of the whole BROADCAST message to send
    * @param {core.topology.ContactNodeListInterface} nodes The nodes to send the message to.
    */
    BroadcastManager.prototype._sendMessageToNodes = function (messageType, message, nodes) {
        for (var i = 0, l = nodes.length; i < l; i++) {
            this._protocolConnectionManager.writeMessageTo(nodes[i], messageType, message);
        }
    };
    return BroadcastManager;
})(events.EventEmitter);

module.exports = BroadcastManager;
//# sourceMappingURL=BroadcastManager.js.map
