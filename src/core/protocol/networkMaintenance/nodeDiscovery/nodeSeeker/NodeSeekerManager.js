var logger = require('../../../../utils/logger/LoggerFactory').create();

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
    function NodeSeekerManager(protocolConfig, myNode, nodeSeekerFactory, protocolConnectionManager, proxyManager) {
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
        * Timeout which calls `iterativeSeekAndPing` when elapsed
        *
        * @member {number} core.protocol.nodeDiscovery.NodeSeekerManager~_iterativeSeekTimeout
        */
        this._iterativeSeekTimeout = 0;
        /**
        * Number of milliseconds for `_iterativeSeekTimeout`
        *
        * @member {number} core.protocol.nodeDiscovery.NodeSeekerManager~_iterativeSeekTimeoutMs
        */
        this._iterativeSeekTimeoutMs = 0;
        /**
        * My node instance
        *
        * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_myNode
        */
        this._myNode = null;
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
        this._iterativeSeekTimeoutMs = protocolConfig.get('protocol.nodeDiscovery.iterativeSeekTimeoutInMs');

        this._myNode = myNode;
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
        logger.info('Force find active node initiated.');
        this._avoidNode = avoidNode;

        if (!this._nodeSeekerList) {
            this._forceFindCallback = callback;
            return;
        }

        this._forceSearchActive = true;

        this._proxyManager.once('contactNodeInformation', function (node) {
            logger.info('NodeSeeker: on contact node!');

            _this._forceSearchActive = false;

            if (_this._iterativeSeekTimeout) {
                logger.info('clearing iterative seek timeout');
                global.clearTimeout(_this._iterativeSeekTimeout);
                _this._iterativeSeekTimeout = 0;
            }

            if (_this._avoidNode && _this._avoidNode.getId().equals(node.getId())) {
                logger.info('Force finding again on nex event loop');
                setImmediate(function () {
                    logger.info('Force finding again, as the node should be avoided.');
                    _this.forceFindActiveNode(_this._avoidNode, callback);
                });
            } else {
                logger.info('Found a node, calling back');
                _this._avoidNode = null;
                callback(node);
            }
        });

        this._iterativeSeekAndPing(avoidNode);
    };

    /**
    * Iterates over the list of NodeSeekers and sends PING to the found nodes, until the search has been deactivated.
    *
    * @method core.protocol.nodeDiscovery.NodeSeekerManager~_iterativeSeekAndPing
    *
    * @param {core.topology.ContactNodeInterface} avoidNode An optional node to avoid, which is not PINGed if returned by one of the seekers.
    */
    NodeSeekerManager.prototype._iterativeSeekAndPing = function (avoidNode) {
        var _this = this;
        if (this._forceSearchActive) {
            logger.info('Doing iterative seek.');

            setImmediate(function () {
                for (var i = 0; i < _this._nodeSeekerList.length; i++) {
                    _this._nodeSeekerList[i].seek(function (node) {
                        logger.info('a seeker found a node.');
                        if (node && !node.getId().equals(_this._myNode.getId()) && !(avoidNode && node.getId().equals(avoidNode.getId()))) {
                            _this._pingNodeIfActive(node);
                        }
                    });
                }

                _this._iterativeSeekTimeout = global.setTimeout(function () {
                    logger.info('setting new iterative seek timeout');
                    _this._iterativeSeekAndPing(avoidNode);
                }, _this._iterativeSeekTimeoutMs);
            });
        } else {
            logger.info('do not seek again.');
        }
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
            logger.info('pinging node.');
            this._protocolConnectionManager.writeMessageTo(node, 'PING', new Buffer(0));
        }
    };
    return NodeSeekerManager;
})();

module.exports = NodeSeekerManager;
//# sourceMappingURL=NodeSeekerManager.js.map
