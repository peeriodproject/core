var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* PingPongNodeUpdateHandlerInterface implementation.
*
* @class core.protocol.ping.PingPongNodeUpdateHandler
* @extends NodeJS.EventEmitter
* @implements core.protocol.ping.PingPongNodeUpdateHandlerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.topology.MyNodeInterface} myNode
* @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager Running protocol connection manager
* @oaram {core.protocol.proxy.ProxyManagerInterface} proxyManager
* @param {core.topology.RoutingTableInterface} routingTable
*/
var PingPongNodeUpdateHandler = (function (_super) {
    __extends(PingPongNodeUpdateHandler, _super);
    function PingPongNodeUpdateHandler(config, myNode, protocolConnectionManager, proxyManager, routingTable) {
        _super.call(this);
        /**
        * The maximum size a waiting list of a bucket can grow to until all incoming nodes for this list are simply discarded.
        *
        * @member {number} core.protocol.ping.PingPongNodeUpdateHandler~_maxWaitingListSize
        */
        this._maxWaitingListSize = 0;
        /**
        * My node.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.ping.PingPongNodeUpdateHandler~_myNode
        */
        this._myNode = null;
        /**
        * The running protocol connection manager instance.
        *
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.ping.PingPongNodeUpdateHandler~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * The running proxy manager instance.
        *
        * @member {core.protocol.proxy.ProxyManagerInterface} core.protocol.ping.PingPongNodeUpdateHandler~_proxyManager
        */
        this._proxyManager = null;
        /**
        * Number of milliseconds a PINGed node has to respond until the PING is considered a fail.
        *
        * @member {number} core.protocol.ping.PingPongNodeUpdateHandler~_reactionTime
        */
        this._reactionTime = 0;
        /**
        * Routing table of the peer.
        *
        * @member {core.topology.RoutingTableInterface} core.protocol.ping.PingPongNodeUpdateHandler~_routingTable
        */
        this._routingTable = null;
        /**
        * The array holding the waiting lists for the buckets.
        *
        * @member {Array<core.protocol.ping.PongWaitingList} core.protocol.ping.PingPongNodeUpdateHandler~_waitingLists
        */
        this._waitingLists = [];

        this._myNode = myNode;
        this._reactionTime = config.get('protocol.waitForNodeReactionInSeconds') * 1000;
        this._maxWaitingListSize = config.get('protocol.pingpong.maxWaitingListSize');
        this._protocolConnectionManager = protocolConnectionManager;
        this._proxyManager = proxyManager;
        this._routingTable = routingTable;

        this._setupListeners();
    }
    PingPongNodeUpdateHandler.prototype._newNodeInformation = function (node) {
        var _this = this;
        this._routingTable.updateContactNode(node, function (err, longestNotSeenContact) {
            if (err && longestNotSeenContact) {
                _this._addToWaitingList(node, longestNotSeenContact);
            }
        });
    };

    PingPongNodeUpdateHandler.prototype._addToWaitingList = function (node, possibleNodeToCheck) {
        var waitingListNumber = this._getWaitingListNumberByNode(node);

        if (waitingListNumber > -1) {
            var existingWaitingList = this._waitingLists[waitingListNumber];
            var isFirst = !existingWaitingList || !existingWaitingList.length;

            if (!existingWaitingList) {
                this._waitingLists[waitingListNumber] = existingWaitingList = [];
            }

            /**
            * @todo stop! timeout und listener dürfen erst später gesetzt werden
            *
            */
            if (existingWaitingList.length < this._maxWaitingListSize) {
                var slot = {
                    newNode: node,
                    nodeToCheck: isFirst ? possibleNodeToCheck : null,
                    timeout: 0
                };
                existingWaitingList.push(slot);

                if (isFirst) {
                    this._handleNextInWaitingList(waitingListNumber);
                }
            }
        }
    };

    PingPongNodeUpdateHandler.prototype._handleNextInWaitingList = function (waitingListNumber) {
        var _this = this;
        var slot = this._waitingLists[waitingListNumber][0];
        if (slot) {
            // there is a slot. check if it already has a node to check
            if (slot.nodeToCheck) {
                this._pingNodeByWaitingSlot(slot, waitingListNumber);
            } else {
                this._routingTable.updateContactNode(slot.newNode, function (err, longestNotSeenContact) {
                    if (err && longestNotSeenContact) {
                        slot.nodeToCheck = longestNotSeenContact;
                        _this._pingNodeByWaitingSlot(slot, waitingListNumber);
                    } else {
                        _this._handleNextInWaitingList(waitingListNumber);
                    }
                });
            }
        }
    };

    PingPongNodeUpdateHandler.prototype._pingNodeByWaitingSlot = function (slot, waitingListNumber) {
        var _this = this;
        this._protocolConnectionManager.writeMessageTo(slot.nodeToCheck, 'PING', new Buffer(0), function (err) {
            if (err) {
                _this._waitingLists[waitingListNumber].splice(0, 1);
                _this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);
            } else {
                slot.timeout = _this._createSlotTimeout(waitingListNumber);
                _this.once(_this._pongEventName(slot.nodeToCheck), _this._createSlotListener(waitingListNumber));
            }
        });
    };

    PingPongNodeUpdateHandler.prototype._pongEventName = function (node) {
        return 'pong' + this._nodeToIdentifier(node);
    };

    PingPongNodeUpdateHandler.prototype._createSlotTimeout = function (waitingListNumber) {
        var _this = this;
        return setTimeout(function () {
            var slot = _this._waitingLists[waitingListNumber].splice(0, 1)[0];

            _this.removeAllListeners(_this._pongEventName(slot.nodeToCheck));
            _this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);
            _this._handleNextInWaitingList(waitingListNumber);
        }, this._reactionTime);
    };

    PingPongNodeUpdateHandler.prototype._createSlotListener = function (waitingListNumber) {
        var _this = this;
        return function () {
            var slot = _this._waitingLists[waitingListNumber].splice(0, 1)[0];

            clearTimeout(slot.timeout);
            _this._handleNextInWaitingList(waitingListNumber);
        };
    };

    PingPongNodeUpdateHandler.prototype._getWaitingListNumberByNode = function (node) {
        return this._myNode.getId().differsInHighestBit(node.getId());
    };

    PingPongNodeUpdateHandler.prototype._setupListeners = function () {
        var _this = this;
        this._proxyManager.on('message', function (message) {
            var type = message.getMessageType();
            if (type === 'PING') {
                _this._sendPongTo(message.getSender());
            } else if (type === 'PONG') {
                _this.emit(_this._pongEventName(message.getSender()));
            }
        });

        this._proxyManager.on('contactNodeInformation', function (node) {
            _this._newNodeInformation(node);
        });
    };

    PingPongNodeUpdateHandler.prototype._sendPongTo = function (node) {
        this._protocolConnectionManager.writeMessageTo(node, 'PONG', new Buffer(0));
    };

    PingPongNodeUpdateHandler.prototype._nodeToIdentifier = function (node) {
        return node.getId().toHexString();
    };
    return PingPongNodeUpdateHandler;
})(events.EventEmitter);

module.exports = PingPongNodeUpdateHandler;
//# sourceMappingURL=PingPongNodeUpdateHandler.js.map
