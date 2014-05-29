/**
* NodeSeekerManagerInterface implementation
*
* @class core.protocol.nodeDiscovery.NodeSeekerManager
* @implements core.protocol.nodeDiscovery.NodeSeekerManagerInterface
*
* @param {core.protocol.nodeDiscovery.NodeSeekerFactoryInterface} nodeSeekerFactory A node seeker factory which generates NodeSeekers.
* @oaram {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection manager.
* @param {core.protocol.proxy.ProxyManagerInterface} proxyManager A working proxy manager.
*/
var NodeSeekerManager = (function () {
    function NodeSeekerManager(nodeSeekerFactory, protocolConnectionManager, proxyManager) {
        var _this = this;
        /**
        * Stores the optional node to avoid.
        *
        * @member {core.topology.ContactNodeInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_avoidNode
        */
        this._avoidNode = null;
        /**
        * Stores the callback to a force find, if `forceFindActiveNode` has been called before the seeker list could be created.
        *
        * @member {Function} core.protocol.nodeDiscovery.NodeSeekerManager~_forceFindCallback
        */
        this._forceFindCallback = null;
        /**
        * Indicator if the search for an active node should be continued.
        *
        * @member {boolean} core.protocol.nodeDiscovery.NodeSeekerManager~_forceSearchActive
        */
        this._forceSearchActive = false;
        /**
        * A NodeSeekerFactory
        *
        * @member {core.protocol.nodeDiscovery.NodeSeekerFactoryInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_nodeSeekerFactory
        */
        this._nodeSeekerFactory = null;
        /**
        * The list of NodeSeekers to iterate over.
        *
        * @member {core.protocol.nodeDiscovery.NodeSeekerList} core.protocol.nodeDiscovery.NodeSeekerManager~_nodeSeekerList
        */
        this._nodeSeekerList = null;
        /**
        * The working ProtocolConnectionManager
        *
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * The working ProxyManager
        *
        * @member {core.protocol.oroxy.ProxyManagerInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_proxyManager
        */
        this._proxyManager = null;
        this._protocolConnectionManager = protocolConnectionManager;
        this._nodeSeekerFactory = nodeSeekerFactory;
        this._proxyManager = proxyManager;

        this._nodeSeekerFactory.createSeekerList(function (list) {
            _this._nodeSeekerList = list;
            if (_this._forceFindCallback) {
                _this.forceFindActiveNode(_this._avoidNode, _this._forceFindCallback);
                _this._forceFindCallback = null;
            }
        });
    }
    NodeSeekerManager.prototype.forceFindActiveNode = function (avoidNode, callback) {
        var _this = this;
        this._avoidNode = avoidNode;

        if (!this._nodeSeekerList) {
            this._forceFindCallback = callback;
            return;
        }

        this._forceSearchActive = true;

        this._proxyManager.once('contactNodeInformation', function (node) {
            _this._forceSearchActive = false;

            if (_this._avoidNode && _this._avoidNode.getId().equals(node.getId())) {
                _this.forceFindActiveNode(_this._avoidNode, callback);
            } else {
                _this._avoidNode = null;
                callback(node);
            }
        });

        this._iterativeSeekAndPing();
    };

    /**
    * Iterates over the list of NodeSeekers and sends PING to the found nodes, until the search has been deactivated.
    *
    * @method core.protocol.nodeDiscovery.NodeSeekerManager~_iterativeSeekAndPing
    */
    NodeSeekerManager.prototype._iterativeSeekAndPing = function () {
        var _this = this;
        process.nextTick(function () {
            if (_this._forceSearchActive) {
                for (var i = 0; i < _this._nodeSeekerList.length; i++) {
                    _this._nodeSeekerList[i].seek(function (node) {
                        _this._pingNodeIfActive(node);
                    });
                }
            }
        });
    };

    /**
    * Sends a PING to a node if the search is active.
    *
    * @method core.protocol.nodeDiscovery.NodeSeekerManager~_pingNodeIfActive
    *
    * @param {core.topology.ContactNodeInterface} node Node to ping
    */
    NodeSeekerManager.prototype._pingNodeIfActive = function (node) {
        if (this._forceSearchActive) {
            this._protocolConnectionManager.writeMessageTo(node, 'PING', new Buffer(0));
        }
    };
    return NodeSeekerManager;
})();

module.exports = NodeSeekerManager;
//# sourceMappingURL=NodeSeekerManager.js.map
