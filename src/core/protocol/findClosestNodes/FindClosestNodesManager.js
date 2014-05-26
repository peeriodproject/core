var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var FoundClosestNodesReadableMessageFactory = require('./messages/FoundClosestNodesReadableMessageFactory');

var FoundClosestNodesWritableMessageFactory = require('./messages/FoundClosestNodesWritableMessageFactory');

var Id = require('../../topology/Id');

var FindClosestNodesCycle = require('./FindClosestNodesCycle');

/**
*
* @class core.protocol.findClosestNodes.FindClosestNodesManager
* @implements core.protocol.findClosestNodes.FindClosestNodesManagerInterface
*
* FindClosestNodesManagerInterface implementation.
*
* @param {core.config.ConfigInterface} topologyConfig Configuration object of the topology namespace.
* @param {core.config.ConfigInterface} protocolConfig Configuration object of the protocol namespace.
* @param {core.topology.MyNodeInterface} myNode My node.
* @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection manager instance.
* @param {core.protocol.proxy.ProxyManagerInterface} proxyManager A working proxy manager instance.
* @param {core.protocol.topology.RoutingTableInterface} routingtable A routing table.
*/
var FindClosestNodesManager = (function (_super) {
    __extends(FindClosestNodesManager, _super);
    function FindClosestNodesManager(topologyConfig, protocolConfig, myNode, protocolConnectionManager, proxyManager, routingTable) {
        _super.call(this);
        /**
        * Number indicating how many nodes to request in a cycle in one go.
        *
        * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_alpha
        */
        this._alpha = 0;
        /**
        * Milliseconds indicating how long a cycle should wait when all nodes have been probed and the
        * confirmed list is not full yet, until the cycle is considered finished.
        *
        * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_cycleExpirationMillis
        */
        this._cycleExpirationMillis = 0;
        /**
        * Number of nodes a cycle should return in the best case, and how many nodes one should return when being requested.
        *
        * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_k
        */
        this._k = 0;
        /**
        * @member {core.topology.MyNodeInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_myNode
        */
        this._myNode = null;
        /**
        * Milliseconds indicating how much time should pass between two alpha-requests in a cycle.
        *
        * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_parallelismDelayMillis
        */
        this._parallelismDelayMillis = 0;
        /**
        * An array keeping track of the IDs being currently searched for.
        *
        * @member {Array<string>} core.protocol.findClosestNodes.FindClosestNodesManager~_pendingCycles
        */
        this._pendingCycles = [];
        /**
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * @member {core.protocol.proxy.ProxyManagerInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_proxyManager
        */
        this._proxyManager = null;
        /**
        * A readable message factory for incoming 'FOUND_CLOSEST_NODES' messages
        *
        * @member {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactoryInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_readableMessageFactory
        */
        this._readableMessageFactory = null;
        /**
        * @member {core.topology.RoutingTableInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_routingTable
        */
        this._routingTable = null;
        /**
        * A writable message factory for outgoing 'FOUND_CLOSEST_NODES' messages
        *
        * @member {core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactoryInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_writableMessageFactory
        */
        this._writableMessageFactory = null;

        this._k = topologyConfig.get('topology.k');
        this._alpha = topologyConfig.get('topology.alpha');
        this._cycleExpirationMillis = protocolConfig.get('protocol.findClosestNodes.cycleExpirationInSeconds') * 1000;
        this._parallelismDelayMillis = protocolConfig.get('protocol.findClosestNodes.parallelismDelayInSeconds') * 1000;

        this._myNode = myNode;
        this._protocolConnectionManager = protocolConnectionManager;
        this._proxyManager = proxyManager;
        this._routingTable = routingTable;

        this._writableMessageFactory = new FoundClosestNodesWritableMessageFactory();
        this._readableMessageFactory = new FoundClosestNodesReadableMessageFactory();

        this._setupListeners();
    }
    FindClosestNodesManager.prototype._setupListeners = function () {
        var _this = this;
        this._proxyManager.on('message', function (message) {
            var type = message.getMessageType();

            if (type === 'FIND_CLOSEST_NODES') {
                var id = null;

                try  {
                    id = new Id(message.getPayload(), 160);
                } catch (e) {
                }

                if (id) {
                    _this._replyToFindNodesFor(message.getSender(), id);
                }
            } else if (type === 'FOUND_CLOSEST_NODES') {
                var foundClosestNodesMsg = null;
                try  {
                    foundClosestNodesMsg = _this._readableMessageFactory.create(message.getPayload());
                } catch (e) {
                }

                if (foundClosestNodesMsg) {
                    _this.emit(foundClosestNodesMsg.getSearchedForId().toHexString(), message.getSender(), foundClosestNodesMsg);
                }
            }
        });
    };

    FindClosestNodesManager.prototype._replyToFindNodesFor = function (requestingNode, searchForId) {
        var _this = this;
        if (this._myNode.getId().equals(searchForId)) {
            var idBuffer = searchForId.getBuffer();
            idBuffer[19] === 0xff ? idBuffer[19]-- : idBuffer[19]++;
        }

        this._routingTable.getClosestContactNodes(searchForId, requestingNode.getId(), function (err, contacts) {
            if (!err && contacts && contacts.length) {
                var payload = null;
                try  {
                    payload = _this._writableMessageFactory.constructPayload(searchForId, contacts);
                } catch (e) {
                }

                if (payload) {
                    _this._protocolConnectionManager.writeMessageTo(requestingNode, 'FOUND_CLOSEST_NODES', payload);
                }
            }
        });
    };

    FindClosestNodesManager.prototype.startCycleFor = function (searchForId) {
        var _this = this;
        this._routingTable.getClosestContactNodes(searchForId, null, function (err, contacts) {
            if (!err && contacts && contacts.length) {
                var identifier = searchForId.toHexString();

                if (_this._pendingCycles.indexOf(identifier) === -1) {
                    var startWithList = contacts.splice(0, Math.min(contacts.length, _this._alpha));

                    _this._pendingCycles.push(identifier);

                    new FindClosestNodesCycle(searchForId, startWithList, _this, _this._protocolConnectionManager, function (resultingList) {
                        _this._pendingCycles.splice(_this._pendingCycles.indexOf(identifier), 1);

                        _this.emit('foundClosestNodes', searchForId, resultingList);
                    });
                }
            }
        });
    };

    FindClosestNodesManager.prototype.getK = function () {
        return this._k;
    };

    FindClosestNodesManager.prototype.getAlpha = function () {
        return this._alpha;
    };

    FindClosestNodesManager.prototype.getCycleExpirationMillis = function () {
        return this._cycleExpirationMillis;
    };

    FindClosestNodesManager.prototype.getParallelismDelayMillis = function () {
        return this._parallelismDelayMillis;
    };
    return FindClosestNodesManager;
})(events.EventEmitter);

module.exports = FindClosestNodesManager;
//# sourceMappingURL=FindClosestNodesManager.js.map
