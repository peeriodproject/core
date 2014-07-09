var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* ConnectionManagerInterface implementation.
*
* @class core.protocol.hydra.ConnectionManager
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.ConnectionManagerInterface
*
* @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection manager.
* @param {core.protocol.hydra.WritableHydraMessageFactoryInterface} writableFactory
* @param {core.protocol.hydra.ReadableHydraMessageFactoryInterface} readableFactory
*/
var ConnectionManager = (function (_super) {
    __extends(ConnectionManager, _super);
    function ConnectionManager(protocolConnectionManager, writableFactory, readableFactory) {
        _super.call(this);
        /**
        * The list of circuit nodes assigned to specific sockets.
        *
        * @member {core.protocol.hydra.HydraNodeMap} core.protocol.hydra.ConnectionManager~_circuitNodes
        */
        this._circuitNodes = {};
        /**
        * Pipeline for messages. Messages aggregate here until one socket has been established.
        *
        * @member {core.utils.BufferListMapInterface} core.protocol.hydra.ConnectionManager~_circuitPipeline
        */
        this._circuitPipeline = {};
        /**
        * @member {core.protocol.hydra.ReadableHydraMessageFactoryInterface} core.protocol.hydra.ConnectionManager~_readableFactory
        */
        this._readableFactory = null;
        /**
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.hydra.ConnectionManager~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.ConnectionManager~_writableFactory
        */
        this._writableFactory = null;

        this._protocolConnectionManager = protocolConnectionManager;
        this._writableFactory = writableFactory;
        this._readableFactory = readableFactory;

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    ConnectionManager.prototype.getCircuitNodes = function () {
        return this._circuitNodes;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    ConnectionManager.prototype.addToCircuitNodes = function (socketIdentifier, node) {
        node.socketIdentifier = socketIdentifier;
        this._circuitNodes[socketIdentifier] = node;
        this._protocolConnectionManager.keepHydraSocketOpen(socketIdentifier);

        if (!node.ip) {
            node.ip = this._protocolConnectionManager.getHydraSocketIp(socketIdentifier);
        }
    };

    ConnectionManager.prototype.pipeCircuitMessageTo = function (node, messageType, payload, skipCircIdOnConstruction) {
        var _this = this;
        var sendableBuffer = null;
        var circuitId = node.circuitId;

        try  {
            sendableBuffer = this._writableFactory.constructMessage(messageType, payload, payload.length, skipCircIdOnConstruction ? null : node.circuitId);
        } catch (e) {
            return;
        }

        if (!node.socketIdentifier && node.port && node.ip) {
            if (!this._circuitPipeline[circuitId]) {
                this._circuitPipeline[circuitId] = [];

                this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, function (err, identifier) {
                    if (!err && identifier) {
                        _this.addToCircuitNodes(identifier, node);

                        var pipeline = _this._circuitPipeline[circuitId];

                        for (var i = 0, l = pipeline.length; i < l; i++) {
                            _this._protocolConnectionManager.hydraWriteMessageTo(identifier, pipeline[i]);
                        }
                    }

                    delete _this._circuitPipeline[circuitId];
                });
            }

            this._circuitPipeline[circuitId].push(sendableBuffer);
        } else if (this._circuitNodes[node.socketIdentifier]) {
            this._protocolConnectionManager.hydraWriteMessageTo(node.socketIdentifier, sendableBuffer);
        }
    };

    ConnectionManager.prototype.pipeMessageTo = function (node, messageType, payload) {
        var _this = this;
        var sendableBuffer = null;

        try  {
            sendableBuffer = this._writableFactory.constructMessage(messageType, payload, payload.length, node.circuitId);
        } catch (e) {
            return;
        }

        this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, function (err, identifier) {
            if (!err && identifier) {
                _this._protocolConnectionManager.hydraWriteMessageTo(identifier, sendableBuffer);
            }
        });
    };

    ConnectionManager.prototype.removeFromCircuitNodes = function (node, closeSocket) {
        if (typeof closeSocket === "undefined") { closeSocket = true; }
        return this._removeFromCircuitNodesByIdentifier(node.socketIdentifier, closeSocket);
    };

    /**
    * Removes a node from the circuit list by the socket identifier and closes the underlying TCP socket.
    *
    * @method core.protocol.hydra.ConnectionManager~_removeFromCircuitNodesByIdentifier
    *
    * @param {string} identifier Socket identifier.
    * @parma {boolean} Indicates if the underlying TCP socket should also be ended.
    * @returns {core.protocol.hydra.HydraNode} node The removed node. `undefined` if the node was not present.
    */
    ConnectionManager.prototype._removeFromCircuitNodesByIdentifier = function (identifier, closeSocket) {
        if (identifier) {
            var circNode = this._circuitNodes[identifier];

            if (circNode) {
                if (closeSocket) {
                    this._protocolConnectionManager.closeHydraSocket(identifier);
                } else {
                    this._protocolConnectionManager.keepHydraSocketNoLongerOpen(identifier);
                }

                delete this._circuitNodes[identifier];

                return circNode;
            }
        }

        return undefined;
    };

    /**
    * Sets up the listeners on the protocol connection manager so that they can be propagated.
    *
    * @method core.protocol.hydra.ConnectionManager~_setupListeners
    */
    ConnectionManager.prototype._setupListeners = function () {
        var _this = this;
        this._protocolConnectionManager.on('terminatedConnection', function (identifier) {
            var circuitNode = _this._removeFromCircuitNodesByIdentifier(identifier, false);

            if (circuitNode) {
                _this.emit('circuitTermination', circuitNode.circuitId);
            }
        });

        this._protocolConnectionManager.on('hydraMessage', function (identifier, ip, message) {
            var msgToEmit = null;

            try  {
                msgToEmit = _this._readableFactory.create(message.getPayload());
            } catch (e) {
            }

            if (msgToEmit) {
                var circuitNode = _this._circuitNodes[identifier];

                if (circuitNode) {
                    if (circuitNode.circuitId === msgToEmit.getCircuitId()) {
                        _this.emit('circuitMessage', msgToEmit, circuitNode);
                    }
                } else {
                    _this.emit('message', msgToEmit, identifier);
                }
            }
        });
    };
    return ConnectionManager;
})(events.EventEmitter);

module.exports = ConnectionManager;
//# sourceMappingURL=ConnectionManager.js.map
