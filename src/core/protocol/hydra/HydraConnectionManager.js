var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* HydraConnectionManagerInterface implementation.
* See interface documentation for funtionality.
*
* @class core.protocol.hydra.HydraConnectionManager
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.HydraConnectionManagerInterface
*
* @param {core.config.ConfigInterface} hydraConfig Hydra configuration
* @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection Manager
* @param {core.protocol.hydra.WritableHydraMessageFactoryInterface} writableFactory A writable hydra message factory instance.
* @param {core.protocol.hydra.ReadableHydraMessageFactoryInterface} readableFactory A readable hydra message factory instance.
*/
var HydraConnectionManager = (function (_super) {
    __extends(HydraConnectionManager, _super);
    function HydraConnectionManager(hydraConfig, protocolConnectionManager, writableFactory, readableFactory) {
        _super.call(this);
        /**
        * The key-value list of circuit nodes, where key is the IP address and value is the Node.
        *
        * @member {Object} core.protocol.hydra.HydraConnectionManager~_circuitNodes
        */
        this._circuitNodes = {};
        /**
        * The number of ms a message which cannot be sent should be kept in the pipeline to wait for a connection
        * until it is discarded.
        *
        * @member {number} core.protocol.hydra.HydraConnectionManager~_keepMessageInPipelineForMs
        */
        this._keepMessageInPipelineForMs = 0;
        /**
        * The key-value list of open sockets, where key is the IP address and value is the identifier of the socket.
        *
        * @member {Object} core.protocol.hydra.HydraConnectionManager~_openSockets
        */
        this._openSockets = {};
        /**
        * The working protocol connection manager.
        *
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.hydra.HydraConnectionManager~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * The readable hydra message factory.
        *
        * @member {core.protocol.hydra.ReadableHydraMessageFactoryInterface} core.protocol.hydra.HydraConnectionManager~_readableFactory
        */
        this._readableFactory = null;
        /**
        * The number of maximum retries when trying to regain a connection to a circuit node, before a `globalConnectionFail`
        * event is emitted.
        * This is only relevant if there is knowledge of a reachable port of the HydraNode.
        *
        * @member {number} core.protocol.hydra.HydraConnectionManager~_retryConnectionMax
        */
        this._retryConnectionMax = 0;
        /**
        * The number of milliseconds to wait for a reconnect to a circuit node (without knowledge of its port), until a
        * `globalConnectionFail` event is emitted.
        * This is only relevant if there is NO knowledge of a reachable port of the HydraNode
        *
        * @member {number} core.protocol.hydra.HydraConnectionManager~_waitForReconnectMs
        */
        this._waitForReconnectMs = 0;
        /**
        * The writable hydra message factory.
        *
        * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.HydraConnectionManager~_writableFactory
        */
        this._writableFactory = null;

        this._writableFactory = writableFactory;
        this._readableFactory = readableFactory;
        this._protocolConnectionManager = protocolConnectionManager;
        this._keepMessageInPipelineForMs = hydraConfig.get('hydra.keepMessageInPipelineForSeconds') * 1000;
        this._waitForReconnectMs = hydraConfig.get('hydra.waitForReconnectInSeconds') * 1000;
        this._retryConnectionMax = hydraConfig.get('hydra.retryConnectionMax');

        this._setupListeners();
    }
    /**
    * BEGIN Testing purposes only
    */
    HydraConnectionManager.prototype.getOpenSocketList = function () {
        return this._openSockets;
    };

    HydraConnectionManager.prototype.getCircuitNodeList = function () {
        return this._circuitNodes;
    };

    /**
    * END Testing purposes only
    */
    HydraConnectionManager.prototype.addToCircuitNodes = function (node) {
        var ip = node.ip;

        if (!this._circuitNodes[ip]) {
            this._circuitNodes[ip] = node;

            var ident = this._openSockets[ip];
            if (ident) {
                this._protocolConnectionManager.keepHydraSocketOpen(ident);
            }
        }
    };

    HydraConnectionManager.prototype.removeFromCircuitNodes = function (node) {
        var ip = node.ip;

        delete this._circuitNodes[ip];

        var ident = this._openSockets[ip];
        if (ident) {
            this._protocolConnectionManager.keepHydraSocketNoLongerOpen(ident);
        }
    };

    HydraConnectionManager.prototype.pipeMessage = function (messageType, payload, to) {
        var _this = this;
        var openSocketIdent = this._openSockets[to.ip];
        var sendableBuffer = this._writableFactory.constructMessage(messageType, payload, payload.length);

        if (openSocketIdent) {
            this._protocolConnectionManager.hydraWriteMessageTo(openSocketIdent, sendableBuffer);
        } else {
            var messageListener = function (identifier) {
                _this._protocolConnectionManager.hydraWriteMessageTo(identifier, sendableBuffer);
                global.clearTimeout(messageTimeout);
            };

            var messageTimeout = global.setTimeout(function (listener) {
                _this.removeListener(to.ip, listener);
            }, this._keepMessageInPipelineForMs, messageListener);

            this.once(to.ip, messageListener);

            if (to.port) {
                this._protocolConnectionManager.hydraConnectTo(to.port, to.ip);
            }
        }
    };

    /**
    * 'Rehooks' the connection to a node. If there is knowledge of a reachable port, it tries to acitvely connect to it.
    * If there is NO knowledge of a reachable port, the manager simply waits for a specific time for a reconnect
    * initiated by the other side.
    *
    * If the reconnect fails, or the timeout elapses, a `globalConnectionFail` event is emitted with the IP as parameter,
    * so that other classes can act accordingly (e.g. tearing down circuits etc.)
    *
    * @method core.protocol.hydra.HydraConnectionManager~_rehookConnection
    *
    * @param {core.protocol.HydraNode} node The node to 'reconnect' to
    */
    HydraConnectionManager.prototype._rehookConnection = function (node) {
        var _this = this;
        if (!node.port) {
            // we have to wait
            var waitTimeout = global.setTimeout(function () {
                _this.emit('globalConnectionFail', node.ip);
            }, this._waitForReconnectMs);

            this.once(node.ip, function () {
                global.clearTimeout(waitTimeout);
                _this.emit('reconnectedTo', node.ip);
            });
        } else {
            // we need to force it
            var connect = function (num) {
                if (num < _this._retryConnectionMax) {
                    _this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, function (err) {
                        if (err) {
                            connect(++num);
                        } else {
                            _this.emit('reconnectedTo', node.ip);
                        }
                    });
                } else {
                    _this.emit('globalConnectionFail', node.ip);
                }
            };

            connect(0);
        }
    };

    /**
    * Sets up the listeners on the protocol connection manager.
    *
    * @method core.protoco.hydra.HydraConnectionManager~_setupListeners
    */
    HydraConnectionManager.prototype._setupListeners = function () {
        var _this = this;
        this._protocolConnectionManager.on('hydraSocket', function (identifier, socket) {
            var ip = socket.getIP();

            if (ip && !_this._openSockets[ip]) {
                _this._openSockets[ip] = identifier;

                if (_this._circuitNodes[ip]) {
                    _this._protocolConnectionManager.keepHydraSocketOpen(identifier);
                }

                _this.emit(ip, identifier);
            } else {
                socket.end();
            }
        });

        this._protocolConnectionManager.on('terminatedConnection', function (identifier) {
            var ips = Object.keys(_this._openSockets);
            var ipsLength = ips.length;
            var theIp = null;

            for (var i = 0; i < ipsLength; i++) {
                if (_this._openSockets[ips[i]] === identifier) {
                    theIp = ips[i];
                }
            }

            if (theIp) {
                delete _this._openSockets[theIp];
            }

            var node = _this._circuitNodes[theIp];
            if (node) {
                _this._rehookConnection(node);
            }
        });

        this._protocolConnectionManager.on('hydraMessage', function (identifier, ip, message) {
            var msgToEmit = null;

            try  {
                msgToEmit = _this._readableFactory.create(message.getPayload());
            } catch (e) {
            }

            if (msgToEmit && ip) {
                _this.emit('hydraMessage', ip, msgToEmit);
            }
        });
    };
    return HydraConnectionManager;
})(events.EventEmitter);

module.exports = HydraConnectionManager;
//# sourceMappingURL=HydraConnectionManager.js.map
