var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var logger = require('../../utils/logger/LoggerFactory').create();

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
    PingPongNodeUpdateHandler.prototype.getWaitingLists = function () {
        return this._waitingLists;
    };

    /**
    * Adds new node information to the waiting list for the right bucket. Checks if it is the first and if so, fires off
    * the ping.
    * The passed `possibleNodeToCheck` can however differ later, if the waiting list isn't empty.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_addToWaitingList
    *
    * @param {core.topology.ContactNodeInterface} node The new node information to add to the waiting list
    * @param {core.topology.ContactNodeInterface} possibleNodeToCheck The currently least recently seen node for the right bucket.
    */
    PingPongNodeUpdateHandler.prototype._addToWaitingList = function (node, possibleNodeToCheck) {
        var waitingListNumber = this._getWaitingListNumberByNode(node);

        if (waitingListNumber > -1) {
            var existingWaitingList = this._waitingLists[waitingListNumber];
            var isFirst = !existingWaitingList || !existingWaitingList.length;

            if (!existingWaitingList) {
                this._waitingLists[waitingListNumber] = existingWaitingList = [];
            }

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

    /**
    * Creates the timeout for a specific waitingListNumber. If it elapses, the first slot of the specified waiting list
    * is removed and the 'old' node of the slot is replaced by the 'new' one in the routing table.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_createSlotTimeout
    *
    * @param {number} waitingListNumber
    * @returns {number|NodeJS.Timer}
    */
    PingPongNodeUpdateHandler.prototype._createSlotTimeout = function (waitingListNumber) {
        var _this = this;
        return global.setTimeout(function () {
            var slot = _this._waitingLists[waitingListNumber].splice(0, 1)[0];

            _this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);

            _this.emit('pingTimeout', slot.nodeToCheck);

            _this._handleNextInWaitingList(waitingListNumber);
        }, this._reactionTime);
    };

    /**
    * Returns the waiting list index of the passed node. Checks it agains my node, so it is actually the bucket
    * number the node should be stored in.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_getWaitingListNumberByNode
    *
    * @param {core.topology.ContactNodeInterface} node Node to check against
    * @returns {number}
    */
    PingPongNodeUpdateHandler.prototype._getWaitingListNumberByNode = function (node) {
        return this._myNode.getId().differsInHighestBit(node.getId());
    };

    /**
    * Takes the first entry of the waiting list with the specified index. If there is an entry, it checks whether
    * the `nodeToCheck` is already set (this is when a slot is put into an empty list). If yes, it PINGs the same.
    * If not, it checks the routing table again for the least recently seen node. If there is none (e.g. the new node
    * could be added), the slot is removed and the next slot is getting checked.
    * If there is one, it is PINGed all the same.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_handleNextInWaitingList
    *
    * @param {number} waitingListNumber
    */
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
                        logger.info('Bucket check', { newNodeDiffer: _this._getWaitingListNumberByNode(slot.newNode), oldNodeDiffer: _this._getWaitingListNumberByNode(longestNotSeenContact) });

                        slot.nodeToCheck = longestNotSeenContact;
                        _this._pingNodeByWaitingSlot(slot, waitingListNumber);
                    } else {
                        _this._waitingLists[waitingListNumber].splice(0, 1);
                        _this._handleNextInWaitingList(waitingListNumber);
                    }
                });
            }
        }
    };

    /**
    * Handles a PONG message. Checks if the PONGing node can be referenced to the first slot in the right waiting list.
    * If yes, nothing is done except removing the slo (and thus discarding the information about the new node).
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_handlePong
    *
    * @param {core.topology.ContactNodeInterface} node The PONGing node
    */
    PingPongNodeUpdateHandler.prototype._handlePong = function (node) {
        var waitingListNumber = this._getWaitingListNumberByNode(node);
        var list = this._waitingLists[waitingListNumber];

        if (list && list.length) {
            var first = list[0];

            if (node.getId().equals(first.nodeToCheck.getId())) {
                list.splice(0, 1);
                global.clearTimeout(first.timeout);

                this.emit('gotPonged', node);

                this._handleNextInWaitingList(waitingListNumber);
            }
        }
    };

    /**
    * The handler for the proxy's `contactNodeInformation` event. Tries to update it in the routing table. If it is not
    * present yet, but the bucket is full, it is added to the waiting list.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_newNodeInformation
    *
    * @param {core.topology.ContactNodeInterface} node The new contact node info.
    */
    PingPongNodeUpdateHandler.prototype._newNodeInformation = function (node) {
        var _this = this;
        this._routingTable.updateContactNode(node, function (err, longestNotSeenContact) {
            if (err && longestNotSeenContact) {
                _this._addToWaitingList(node, longestNotSeenContact);
            }
        });
    };

    /**
    * Sends a PING message to the `nodeToCheck` in a waiting slot and act accordingly. If the sending fails,
    * the slot is immediately removed and the `nodeToCheck` replaced with the `newNode`. If not, the timeout is set.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_pingNodeByWaitingSlot
    *
    * @param {core.protocol.ping.PongWaitingSlot} slot
    * @param {number} waitingListNumber
    */
    PingPongNodeUpdateHandler.prototype._pingNodeByWaitingSlot = function (slot, waitingListNumber) {
        var _this = this;
        this._protocolConnectionManager.writeMessageTo(slot.nodeToCheck, 'PING', new Buffer(0), function (err) {
            if (err) {
                _this._waitingLists[waitingListNumber].splice(0, 1);

                _this._routingTable.replaceContactNode(slot.nodeToCheck, slot.newNode);
            } else {
                slot.timeout = _this._createSlotTimeout(waitingListNumber);
            }
        });
    };

    /**
    * Sends a PONG message to the specified node.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_sendPongTo
    *
    * @param {core.topology.ContactNodeInterface} node
    */
    PingPongNodeUpdateHandler.prototype._sendPongTo = function (node) {
        this._protocolConnectionManager.writeMessageTo(node, 'PONG', new Buffer(0));
    };

    /**
    * Initially sets up the listeners on the proxy's `message` and `contactNodeInformation` event.
    *
    * @method core.protocol.ping.PingPongNodeUpdateHandler~_setupListeners
    *
    */
    PingPongNodeUpdateHandler.prototype._setupListeners = function () {
        var _this = this;
        this._proxyManager.on('message', function (message) {
            var type = message.getMessageType();

            if (type === 'PING') {
                _this._sendPongTo(message.getSender());
            } else if (type === 'PONG') {
                _this._handlePong(message.getSender());
            }
        });

        this._proxyManager.on('contactNodeInformation', function (node) {
            _this._newNodeInformation(node);
        });
    };
    return PingPongNodeUpdateHandler;
})(events.EventEmitter);

module.exports = PingPongNodeUpdateHandler;
//# sourceMappingURL=PingPongNodeUpdateHandler.js.map
