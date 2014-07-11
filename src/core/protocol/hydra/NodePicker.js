var logger = require('../../utils/logger/LoggerFactory').create();

/**
* NodePickerInterface implementation.
*
* @class core.protocol.hydra.NodePicker
* @implements core.protocol.hydra.NodePickerInterface
*
* @param {core.config.ConfigInterface} hydraConfig Hydra configuration
* @param {number} relayNodeAmount Number of nodes which will be returned on a call to `pickRelayNodeBatch`
* @param {core.topology.RoutingTableInterface} routingTable A routing table instance where all nodes will be picked from.
* @param {core.net.tcp.TCPSocketHandlerInterface} tcpSocketHandler Working TCP socket handler
*/
var NodePicker = (function () {
    function NodePicker(hydraConfig, relayNodeAmount, routingTable, tcpSocketHandler) {
        /**
        * The number of nodes which will be chosen on a call to `pickNextAdditiveNodeBatch`.
        * This gets populated by the config.
        *
        * @member {number} core.protocol.hydra.NodePicker~_additiveNodeAmount
        */
        this._additiveNodeAmount = 0;
        /**
        * Usually, two addresses are considered equal, if merely their IP is identical. This is a safety measure as
        * multiple computers in a network can work together to break the additive sharing scheme.
        * If this is true, however, two addresses are considered equal if their IP AND their port matches.
        *
        * WARNING! This should only be used for testing purposes.
        *
        * @member {boolean} core.protocol.hydra.NodePicker~_allowIdenticalIps
        */
        this._allowIdenticalIps = false;
        /**
        * Threshold of 'errors' (unsuccessful random node tries) until the waiting timeout is set.
        * This gets populated by the config.
        *
        * @member {number} core.protocol.hydra.NodePicker~_errorThreshold
        */
        this._errorThreshold = 0;
        /**
        * Array which keeps track of nodes picked for additive rounds.
        *
        * @member {number} core.protocol.hydra.NodePicker~_nodesUsed
        */
        this._nodesUsed = [];
        /**
        * Number of nodes which will be returned on a call to `pickRelayNodes`.
        * This gets populated via the constructor argument.
        *
        * @member {number} core.protocol.hydra.NodePicker~_relayNodeAmount
        */
        this._relayNodeAmount = 0;
        /**
        * The list of nodes picked on a call to `pickRelayNodes`.
        *
        * @member {core.protocol.hydra.HydraNodeList} core.protocol.hydra.NodePicker~_relayNodeAmount
        */
        this._relayNodes = [];
        /**
        * The routing table instance used for picking random nodes.
        *
        * @member {core.topology.RoutingTableInterface} core.protocol.hydra.NodePicker~_routingTable
        */
        this._routingTable = null;
        /**
        * TCP Socket handler to check node addresses against own addresses.
        *
        * @member {core.net.tcp.TCPSocketHandlerInterface} core.protocol.hydra.NodePicker~_tcpSocketHandler
        */
        this._tcpSocketHandler = null;
        /**
        * Maximum number of nodes which have been chosen in previous additive rounds that can be used in subsequent rounds.
        * (this is per round)
        *
        * @member {number} core.protocol.hydra.NodePicker~_threshold
        */
        this._threshold = 0;
        /**
        * Number of milliseconds to wait when the error threshold is passed.
        *
        * @member {number} core.protocol.hydra.NodePicker~_waitingTimeInMs
        */
        this._waitingTimeInMs = 0;
        this._relayNodeAmount = relayNodeAmount;
        this._allowIdenticalIps = hydraConfig.get('hydra.nodePicker.allowIdenticalIps');
        this._additiveNodeAmount = hydraConfig.get('hydra.additiveSharingNodeAmount');
        this._threshold = hydraConfig.get('hydra.nodePicker.roundThreshold');
        this._waitingTimeInMs = hydraConfig.get('hydra.nodePicker.waitingTimeInSeconds') * 1000;
        this._errorThreshold = hydraConfig.get('hydra.nodePicker.errorThreshold');
        this._routingTable = routingTable;
        this._tcpSocketHandler = tcpSocketHandler;
        //console.log(this._tcpSocketHandler);
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    NodePicker.prototype.getRelayNodes = function () {
        return this._relayNodes;
    };

    NodePicker.prototype.getNodesUsed = function () {
        return this._nodesUsed;
    };

    NodePicker.prototype.getAdditiveNodeAmount = function () {
        return this._additiveNodeAmount;
    };

    NodePicker.prototype.getThreshold = function () {
        return this._threshold;
    };

    NodePicker.prototype.getWaitingTime = function () {
        return this._waitingTimeInMs;
    };

    NodePicker.prototype.getErrorThreshold = function () {
        return this._errorThreshold;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    NodePicker.prototype.pickAdditionalRelayNode = function (callback) {
        var _this = this;
        if (!this._relayNodes.length) {
            throw new Error('NodePicker: Picking additional relay node before general relay nodes is not allowed!');
        }

        this._pickBatch(1, 0, true, function (batch) {
            var node = batch[0];

            _this._relayNodes.push(node);
            callback(node);
        });
    };

    NodePicker.prototype.pickNextAdditiveNodeBatch = function (callback) {
        var _this = this;
        if (!this._relayNodes.length) {
            throw new Error('NodePicker: Picking additive nodes before relay nodes is not allowed!');
        }

        logger.log('hydraExtension', 'Picking next additive node batch.');
        this._pickBatch(this._additiveNodeAmount, this._threshold, true, function (batch) {
            _this._nodesUsed = _this._nodesUsed.concat(batch);
            callback(batch);
        });
    };

    NodePicker.prototype.pickRelayNodeBatch = function (callback) {
        var _this = this;
        if (this._relayNodes.length) {
            throw new Error('NodePicker: Relay nodes can only be picked once!');
        }

        logger.log('hydraExtension', 'Picking relay node batch.');
        this._pickBatch(this._relayNodeAmount, this._threshold, false, function (batch) {
            _this._relayNodes = batch;

            callback(batch);
        });
    };

    /**
    * Picks a random IP:Port pair from a contact node and returns it as a hydra node if possible.
    *
    * @method core.protocol.hydra.NodePicker~_contactNodeToRandHydraNode
    *
    * @param {core.topology.ContactNodeInterface} contactNode The contact node to choose the address from.
    * @returns {core.protocol.hydra.HydraNode}
    */
    NodePicker.prototype._contactNodeToRandHydraNode = function (contactNode) {
        var retNode = null;
        var addresses = contactNode.getAddresses();

        if (addresses.length) {
            var address = addresses[Math.floor(Math.random() * addresses.length)];

            if (address.getIp() && address.getPort()) {
                retNode = {
                    ip: address.getIp(),
                    port: address.getPort()
                };
            }
        }

        return retNode;
    };

    /**
    * Checks if the ip of a hydra node already exists within a given list of hydra nodes.
    * If identical IPs are allowed, the ports need to differ.
    *
    * @method core.protocol.hydra.NodePicker~_nodeExistsInBatch
    *
    * @param {core.protocol.hydra.HydraNode} node The node to check.
    * @param {core.protocol.hydra.HydraNodeList} batch The list of hydra nodes to check against.
    *
    * @returns {boolean} `true` if existing, `false` otherwise.
    */
    NodePicker.prototype._nodeExistsInBatch = function (node, batch) {
        var exists = false;
        var ip = node.ip;
        var port = node.port;

        for (var i = 0, l = batch.length; i < l; i++) {
            if (batch[i].ip === ip && (!this._allowIdenticalIps || batch[i].port === port)) {
                exists = true;
                break;
            }
        }

        return exists;
    };

    /**
    * Checks if the ip and port of a chosen node is similar to the machine's own address.
    * This can happen if this node proxies for others, i.e. the own address appears in the routing table.
    *
    * @method core.protocol.hydra.NodePicker~_nodeIsSelf
    *
    * @param {core.protocol.hydra.HydraNode} node The node to check.
    * @returns {boolean}
    */
    NodePicker.prototype._nodeIsSelf = function (node) {
        return this._tcpSocketHandler.getMyExternalIp() === node.ip && (this._tcpSocketHandler.getOpenServerPortsArray().indexOf(node.port) > -1);
    };

    /**
    * The main method which picks random nodes from the routing table and returns them (via a callback) as an array.
    * It follows the rules specified in {@link core.protocol.hydra.NodePickerInterface}.
    *
    * @method core.protocol.hydra.NodePicker~_pickBatch
    *
    * @param {number} amount The number of nodes to pick.
    * @param {number} usedThreshold The threshold of nodes already used which can be picked again.
    * @param {boolean} avoidRelayNodes If this is true, then any chosen node may not be part of the (already chosen) relay node list.
    * @param {Function} callback Callback function which gets called with the resulting batch of nodes as argument.
    */
    NodePicker.prototype._pickBatch = function (amount, usedThreshold, avoidRelayNodes, callback) {
        var _this = this;
        var returnBatch = [];
        var errorCount = 0;
        var threshold = 0;

        var getRandomNode = function () {
            logger.log('hydraExtension', 'Picker: getRandomNode', { batchLen: returnBatch.length });

            if (returnBatch.length === amount) {
                callback(returnBatch);
            } else if (errorCount > _this._errorThreshold) {
                logger.log('hydraExtension', 'Setting picker timeout', { ms: _this._waitingTimeInMs });
                global.setTimeout(function () {
                    errorCount = 0;
                    getRandomNode();
                }, _this._waitingTimeInMs);
            } else {
                _this._routingTable.getRandomContactNode(function (err, contactNode) {
                    var noError = false;

                    if (!err && contactNode) {
                        var node = _this._contactNodeToRandHydraNode(contactNode);

                        if (node && !_this._nodeIsSelf(node) && !_this._nodeExistsInBatch(node, returnBatch) && (!avoidRelayNodes || !_this._nodeExistsInBatch(node, _this._relayNodes))) {
                            if (!_this._nodeExistsInBatch(node, _this._nodesUsed)) {
                                noError = true;
                                returnBatch.push(node);
                            } else if (threshold < usedThreshold) {
                                noError = true;
                                threshold++;
                                returnBatch.push(node);
                            }
                            logger.log('hydraExtension', 'Picker: Node is accepted', { ip: node.ip, port: node.port });
                        } else {
                            logger.log('hydraExtension', 'Picker: Node is already in return batch or in relay nodes', { ip: node.ip, port: node.port });
                        }
                    } else {
                        logger.log('hydraExtension', 'Picker: RoutingTable rendered error.');
                    }

                    if (!noError) {
                        errorCount++;
                    }

                    getRandomNode();
                });
            }
        };

        getRandomNode();
    };
    return NodePicker;
})();

module.exports = NodePicker;
//# sourceMappingURL=NodePicker.js.map
