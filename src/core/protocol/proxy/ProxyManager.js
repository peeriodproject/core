var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var Id = require('../../topology/Id');

/**
* ProxyManagerInterface implementation.
*
* @class core.protocol.proxy.ProxyManager
* @extends NodeJS.EventEmitter
* @implements core.protocl.proxy.ProxyManagerInterface
*
* @param {core.config.ConfigInterface} config The configuration object
* @apram {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A running connection manager.
* @param {core.topology.RoutingTableInterface} routingTable The routing table of the node.
*/
var ProxyManager = (function (_super) {
    __extends(ProxyManager, _super);
    function ProxyManager(config, protocolConnectionManager, routingTable) {
        _super.call(this);
        /**
        * A flag indicating if a potential new proxy request can be fired off.
        *
        * @member {boolean} core.protocol.proxy.ProxyManager~_canProxyCycle
        */
        this._canProxyCycle = true;
        /**
        * The list of confirmed nodes proxying for oneself.
        *
        * @member {core.protocol.proxy.ProxyList} core.protocol.proxy.ProxyManager~_confirmedProxies
        */
        this._confirmedProxies = {};
        /**
        * The list of external addresses of my node. Used to check if the my node needs a proxy or can be a proxy.
        *
        * @member {core.topology.ContactNodeAddressListInterface} core.protocol.proxy.ProxyManager~_externalAddressList
        */
        this._externalAddressList = null;
        /**
        * Temporary list of node identifiers to ignore on following proxy cycles. Gets reset after the waiting timeout.
        *
        * @member {Array<string>} core.protocol.proxy.ProxyManager~_ignoreProxies
        */
        this._ignoreProxies = [];
        /**
        * The maximum number of proxies the node can possibly have. Populated by config.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_maxNumberOfProxies
        */
        this._maxNumberOfProxies = 0;
        /**
        * The maximum number of unsuccessful proxy request tries before the waiting timeout is fired. Populated by config.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_maxUnsuccessfulProxyTries
        */
        this._maxUnsuccessfulProxyTries = 0;
        /**
        * My node.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.proxy.ProxyManager~_myNode
        */
        this._myNode = null;
        /**
        * The running protocol connection manager. Provided in the constructor.
        *
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.proxy.ProxyManager~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * A hardcoded list of human-readable message types which should concern the ProxyManager instance.
        *
        * @member {Array<string>} core.protocol.proxy.ProxyManager~_proxyAffineMessages
        */
        this._proxyAffineMessages = ['PROXY_REQUEST', 'PROXY_ACCEPT', 'PROXY_REJECT', 'PROXY_THROUGH'];
        /**
        * A maximum number of nodes one can be a proxy for. Populated by config.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_proxyForMaxNumberOfNodes
        */
        this._proxyForMaxNumberOfNodes = 0;
        /**
        * The list of nodes one proxies for.
        *
        * @member {core.protocol.proxy.ProxyList} core.protocol.proxy.ProxyManager~_proxyingFor
        */
        this._proxyingFor = {};
        /**
        * The waiting timeout which blocks the proxy cycle until expiration.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_proxyWaitTimeout
        */
        this._proxyWaitTimeout = 0;
        /**
        * A flag indicating whether the machine is reachable from outside.
        *
        * @member {boolean} core.protocol.proxy.ProxyManager~_reachableFromOutside
        */
        this._reachableFromOutside = false;
        /**
        * The time in milliseconds a requested node has to answer before the request is discarded.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_reactionTime
        */
        this._reactionTime = 0;
        /**
        * A list of identifiers with assigned timeouts of the requested proxy nodes.
        *
        * @member {Object} core.protocol.proxy.ProxyManager~_requestedProxies
        */
        this._requestedProxies = {};
        /**
        * My node's routing table.
        *
        * @member {core.topology.RoutingTableInterface} core.protocol.proxy.ProxyManager~_routingTable
        */
        this._routingTable = null;
        /**
        * Number keeping track of the unsuccessful proxy tries. Gets reset to 0 after the wait timeout expires.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_unsuccessfulProxyTries
        */
        this._unsuccessfulProxyTries = 0;
        /**
        * Milliseconds to wait until a blockes proxy cycle is unblocked again. Populated by config.
        *
        * @member {number} core.protocol.proxy.ProxyManager~_unsuccessfulProxyTryWaitTime
        */
        this._unsuccessfulProxyTryWaitTime = 0;

        this._maxNumberOfProxies = config.get('protocol.proxy.maxNumberOfProxies');
        this._proxyForMaxNumberOfNodes = config.get('protocol.proxy.proxyForMaxNumberOfNodes');
        this._reactionTime = config.get('protocol.waitForNodeReactionInSeconds') * 1000;
        this._maxUnsuccessfulProxyTries = config.get('protocol.proxy.maxUnsuccessfulProxyTries');
        this._unsuccessfulProxyTryWaitTime = config.get('protocol.proxy.unsuccessfulProxyTryWaitTimeInSeconds') * 1000;

        this._protocolConnectionManager = protocolConnectionManager;
        this._routingTable = routingTable;

        this._myNode = this._protocolConnectionManager.getMyNode();
        this._externalAddressList = this._myNode.getAddresses();

        if (this._externalAddressList.length) {
            this._reachableFromOutside = true;
        }

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    ProxyManager.prototype.getMyNode = function () {
        return this._myNode;
    };

    ProxyManager.prototype.getRequestedProxies = function () {
        return this._requestedProxies;
    };

    ProxyManager.prototype.getConfirmedProxies = function () {
        return this._confirmedProxies;
    };

    ProxyManager.prototype.getProxyingFor = function () {
        return this._proxyingFor;
    };

    ProxyManager.prototype.getProtocolConnectionManager = function () {
        return this._protocolConnectionManager;
    };

    ProxyManager.prototype.isBlocked = function () {
        return !this._canProxyCycle;
    };

    ProxyManager.prototype.block = function () {
        this._canProxyCycle = false;
    };

    ProxyManager.prototype.unblock = function () {
        this._canProxyCycle = true;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    ProxyManager.prototype.isProxyCapable = function () {
        return (Object.keys(this._proxyingFor).length < this._proxyForMaxNumberOfNodes) && this._reachableFromOutside;
    };

    ProxyManager.prototype.kickOff = function () {
        this._canProxyCycle = true;
        this._proxyCycleOnNextTick();
    };

    ProxyManager.prototype.needsAdditionalProxy = function () {
        return ((Object.keys(this._confirmedProxies).length + Object.keys(this._requestedProxies).length) < this._maxNumberOfProxies) && !this._reachableFromOutside;
    };

    /**
    * Adds a node to the confirmed proxy list, tells the connection manager to keep the sockets open from this node
    * and updates my node addresses accordingly.
    *
    * @method core.protocol.proxy.ProxyManager~_addToConfirmedProxies
    *
    * @param {string} identifier Node identifier
    * @param {core.topology.ContactNodeInterface} node The contact node to add to the proxy list.
    */
    ProxyManager.prototype._addToConfirmedProxies = function (identifier, node) {
        this._confirmedProxies[identifier] = node;
        this._protocolConnectionManager.keepSocketsOpenFromNode(node);
        this._updateMyNodeAddresses();
    };

    /**
    * Adds a node the list one is proxying for. Tells the connection manager to keep the sockets open from this node.
    *
    * @method core.protocol.proxy.ProxyManager~_addToProxyingFor
    *
    * @param {string} identifier Node identifier
    * @param {core.topology.ContactNodeInterface} node The contact node to add to the proxyingFor list.
    */
    ProxyManager.prototype._addToProxyingFor = function (identifier, node) {
        this._proxyingFor[identifier] = node;
        this._protocolConnectionManager.keepSocketsOpenFromNode(node);
    };

    /**
    * Blocks the proxy cycle for a specific time.
    *
    * @method core.protocol.proxy.ProxyManager~_blockProxyCycle
    */
    ProxyManager.prototype._blockProxyCycle = function () {
        var _this = this;
        this._canProxyCycle = false;
        if (this._proxyWaitTimeout) {
            clearTimeout(this._proxyWaitTimeout);
            this._proxyWaitTimeout = 0;
        }
        this._proxyWaitTimeout = setTimeout(function () {
            _this._canProxyCycle = true;
            _this._unsuccessfulProxyTries = 0;
            _this._ignoreProxies = [];

            _this._proxyCycleOnNextTick();
        }, this._unsuccessfulProxyTryWaitTime);
    };

    /**
    * Checks if the node can be used as a potential proxy.
    *
    * @method core.protocol.proxy.ProxyManager~_canUseNodeAsProxy
    *
    * @param {core.topology.ContactNodeInterface} node Node to check.
    */
    ProxyManager.prototype._canUseNodeAsProxy = function (node) {
        var identifier = this._nodeToIdentifier(node);
        var canUse = true;

        canUse = this._confirmedProxies[identifier] ? false : canUse;
        canUse = this._requestedProxies[identifier] ? false : canUse;
        canUse = this._ignoreProxies.indexOf(identifier) > -1 ? false : canUse;

        if (!canUse) {
            this._unsuccessfulProxyTries++;
            if (this._unsuccessfulProxyTries >= this._maxUnsuccessfulProxyTries) {
                this._blockProxyCycle();
            }
        }

        return canUse;
    };

    /**
    * The handler for all messages concerning the proxy.
    * If the message is of type PROXY_REJECT or PROXY_ACCEPT, the requested proxy is handled accordingly.
    * If it is a PROXY_REQUEST, it is checked whether one can by a proxy. If yes, a PROXY_ACCEPT message is sent back, else
    * a PROXY_REJECT message is sent back.
    * If it is a PROXY_THROUGH message, the payload is forced back through the data pipeline.
    *
    * @method core.protocol.proxy.ProxyManager~_handleProxyMessage
    *
    * @param {core.protocol.messages.ReadableMessageInterface} message The message to handle
    */
    ProxyManager.prototype._handleProxyMessage = function (message) {
        var _this = this;
        var msgType = message.getMessageType();
        var sender = message.getSender();
        var identifier = this._nodeToIdentifier(sender);

        if (msgType === 'PROXY_REJECT' || msgType === 'PROXY_ACCEPT') {
            var requestedProxy = this._requestedProxies[identifier];
            if (requestedProxy) {
                this._removeFromRequestedProxies(identifier);

                if (msgType === 'PROXY_ACCEPT') {
                    this._addToConfirmedProxies(identifier, sender);
                    this.emit('newProxy', sender);
                } else {
                    this.emit('proxyReject', sender);
                }

                this._proxyCycleOnNextTick();
            }
            message.discard();
        } else if (msgType === 'PROXY_REQUEST') {
            if (!this._proxyingFor[identifier] && this.isProxyCapable()) {
                this._protocolConnectionManager.writeMessageTo(sender, 'PROXY_ACCEPT', new Buffer(0), function (err) {
                    if (!err) {
                        _this._addToProxyingFor(identifier, sender);
                        _this.emit('proxyingFor', sender);
                    }
                });
            } else {
                this._protocolConnectionManager.writeMessageTo(sender, 'PROXY_REJECT', new Buffer(0));
                message.discard();
            }
        } else if (msgType === 'PROXY_THROUGH') {
            if (this._confirmedProxies[identifier]) {
                // force message through the pipe
                this._protocolConnectionManager.forceMessageThroughPipe(sender, message.getPayload());
            }
        }
    };

    /**
    * Checks if the receiver ID stated in the message is the same as the ID of my node.
    *
    * @method core.protocol.proxy.ProxyManager~_messageIsIntendedForMyNode
    *
    * @param {core.protocol.messages.ReadableMessageInterface} message
    * @returns {boolean}
    */
    ProxyManager.prototype._messageIsIntendedForMyNode = function (message) {
        return message.getReceiverId().equals(this._myNode.getId());
    };

    /**
    * Compares the message type of the specified message with the class's hardcoded list of prxa affine message types.
    *
    * @method core.protocol.proxy.ProxyManager~_messageIsProxyAffine
    *
    * @param {core.protocol.messages.ReadableMessageInterface} message
    * @returns {boolean}
    */
    ProxyManager.prototype._messageIsProxyAffine = function (message) {
        return this._proxyAffineMessages.indexOf(message.getMessageType()) > -1;
    };

    /**
    * Returns the hexadecimal string representation of the provided node's ID.
    *
    * @method core.protocol.proxy.ProxyManager~_nodeToIdentifier
    *
    * @param {core.topology.ContactNodeInterface} node
    * @returns {string}
    */
    ProxyManager.prototype._nodeToIdentifier = function (node) {
        return node.getId().toHexString();
    };

    /**
    * The initial method. Checks if the proxy cycle is active and if the node needs an additional proxy. If yes, it chooses
    * a node randomly from the routing table, tests if it is usable a a potential node, and if yes, sends a proxy request to it.
    *
    * @method core.protocol.proxy.ProxyManager~_proxyCycle
    */
    ProxyManager.prototype._proxyCycle = function () {
        var _this = this;
        if (this._canProxyCycle && this.needsAdditionalProxy()) {
            this._routingTable.getRandomContactNode(function (err, potentialNode) {
                if (err) {
                    _this._blockProxyCycle();
                } else if (potentialNode && _this._canUseNodeAsProxy(potentialNode)) {
                    _this._requestProxy(potentialNode);
                } else {
                    _this._proxyCycleOnNextTick();
                }
            });
        }
    };

    ProxyManager.prototype._proxyCycleOnNextTick = function () {
        var _this = this;
        setImmediate(function () {
            _this._proxyCycle();
        });
    };

    /**
    * Proxies a message not intended for my node through to the actual intended receiver.
    *
    * @method core.protocol.proxy.ProxyManager~_proxyMessageThrough
    *
    * @param {core.protocol.messages.ReadableMessageInterface} message
    */
    ProxyManager.prototype._proxyMessageThrough = function (message) {
        var identifier = message.getReceiverId().toHexString();
        var proxyingForNode = this._proxyingFor[identifier];
        if (proxyingForNode) {
            this._protocolConnectionManager.writeMessageTo(proxyingForNode, 'PROXY_THROUGH', message.getRawBuffer(), function () {
                message.discard();
            });
        } else {
            message.discard();
        }
    };

    /**
    * Clears the timeout of a requested proxy, removes the entry and adds the identifier to the `ignoreProxies` list.
    *
    * @method core.protocol.proxy.ProxyManager~_removeFromRequestedProxies
    *
    * @param {string} identifier Identifier of the requested proxy.
    */
    ProxyManager.prototype._removeFromRequestedProxies = function (identifier) {
        var requestedProxy = this._requestedProxies[identifier];

        clearTimeout(requestedProxy);
        delete this._requestedProxies[identifier];
        this._ignoreProxies.push[identifier];
    };

    /**
    * Sends a PROXY_REQUEST to the provided node and adds it to the requested proxy list with a timeout indicating how
    * long the requested node has time to answer.
    *
    * @method core.protocol.proxy.ProxyManager~_requestProxy
    *
    * @param {core.topology.ContactNodeInterface} node The node to request.
    */
    ProxyManager.prototype._requestProxy = function (node) {
        var _this = this;
        var identifier = this._nodeToIdentifier(node);
        this._protocolConnectionManager.writeMessageTo(node, 'PROXY_REQUEST', new Buffer(0), function (err) {
            if (!err) {
                _this._requestedProxies[identifier] = setTimeout(function () {
                    _this._requestProxyTimeout(identifier);
                }, _this._reactionTime);
            }
            _this._proxyCycleOnNextTick();
        });
    };

    /**
    * What happens when a requested node fails to respond in a certain time window:
    * It is removed from the requested proxy list and a new proxy cycle is kicked off.
    *
    * @method core.protocol.proxy.ProxyManager~_requestProxyTimeout
    *
    * @param {string} identifier Identifier of the requested proxy
    */
    ProxyManager.prototype._requestProxyTimeout = function (identifier) {
        if (this._requestedProxies[identifier]) {
            delete this._requestedProxies[identifier];
            this._ignoreProxies.push(identifier);

            // this event is for testing purposes only
            this.emit('requestProxyTimeout', identifier);
            this._proxyCycleOnNextTick();
        }
    };

    /**
    * Sets the `message` and `terminatedConnection` listeners on the ProtocolConnectionManagerInterface
    *
    * @method core.protocol.proxy.ProxyManager~_setupListeners
    */
    ProxyManager.prototype._setupListeners = function () {
        var _this = this;
        this._protocolConnectionManager.on('message', function (message) {
            // update the contact node in the routing table accordingly, do ping pong if necessary, but not in here
            var sender = message.getSender();

            if (sender.getAddresses().length > 0) {
                _this.emit('contactNodeInformation', message.getSender());
            }

            // check if the message is intended for us and if yes, and it is a proxy affine message, act accordingly
            if (_this._messageIsIntendedForMyNode(message)) {
                if (_this._messageIsProxyAffine(message)) {
                    _this._handleProxyMessage(message);
                } else {
                    _this.emit('message', message);
                }
            } else {
                _this._proxyMessageThrough(message);
            }
        });

        this._protocolConnectionManager.on('terminatedConnection', function (id) {
            if (id instanceof Id) {
                var identifier = id.toHexString();
                var doStartCycle = false;
                var requestedProxy = _this._requestedProxies[identifier];
                var confirmedProxy = _this._confirmedProxies[identifier];
                var proxyingFor = _this._proxyingFor[identifier];

                if (requestedProxy) {
                    doStartCycle = true;
                    _this._removeFromRequestedProxies(identifier);
                    _this.emit('requestProxyTimeout', identifier);
                }
                if (confirmedProxy) {
                    doStartCycle = true;
                    _this._protocolConnectionManager.keepSocketsNoLongerOpenFromNode(confirmedProxy);
                    delete _this._confirmedProxies[identifier];
                    _this._updateMyNodeAddresses();
                    _this.emit('lostProxy', confirmedProxy);
                }
                if (proxyingFor) {
                    _this._protocolConnectionManager.keepSocketsNoLongerOpenFromNode(proxyingFor);
                    delete _this._proxyingFor[identifier];
                    _this.emit('lostProxyingFor', proxyingFor);
                }

                if (doStartCycle) {
                    _this._proxyCycleOnNextTick();
                }
            }
        });
    };

    /**
    * Updates MyNode's address list according to the list of confirmed proxies.
    *
    * @method core.protocol.proxy.ProxyManager~_updateMyNodeAddresses
    */
    ProxyManager.prototype._updateMyNodeAddresses = function () {
        var addressList = [];
        var keys = Object.keys(this._confirmedProxies);

        for (var i = 0; i < keys.length; i++) {
            addressList = addressList.concat(this._confirmedProxies[keys[i]].getAddresses());
        }

        this._myNode.updateAddresses(addressList);
    };
    return ProxyManager;
})(events.EventEmitter);

module.exports = ProxyManager;
//# sourceMappingURL=ProxyManager.js.map
