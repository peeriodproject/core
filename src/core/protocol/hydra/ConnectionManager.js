var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var ConnectionManager = (function (_super) {
    __extends(ConnectionManager, _super);
    function ConnectionManager(protocolConnectionManager, writableFactory, readableFactory) {
        _super.call(this);
        this._protocolConnectionManager = null;
        this._writableFactory = null;
        this._readableFactory = null;
        this._circuitNodes = {};
        this._circuitPipeline = {};

        this._protocolConnectionManager = protocolConnectionManager;
        this._writableFactory = writableFactory;
        this._readableFactory = readableFactory;

        this._setupListeners();
    }
    ConnectionManager.prototype.getCircuitNodes = function () {
        return this._circuitNodes;
    };

    ConnectionManager.prototype.addToCircuitNodes = function (socketIdentifier, node) {
        node.socketIdentifier = socketIdentifier;
        this._circuitNodes[socketIdentifier] = node;
        this._protocolConnectionManager.keepHydraSocketOpen(socketIdentifier);
    };

    ConnectionManager.prototype.removeFromCircuitNodes = function (node) {
        return this._removeFromCircuitNodesByIdentifier(node.socketIdentifier);
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

    ConnectionManager.prototype.pipeCircuitMessageTo = function (node, messageType, payload, skipCircIdOnConstruction) {
        var _this = this;
        var sendableBuffer = null;
        var circuitId = node.circuitId;

        try  {
            sendableBuffer = this._writableFactory.constructMessage(messageType, payload, payload.length, skipCircIdOnConstruction ? null : node.circuitId);
        } catch (e) {
            return;
        }

        if (!node.socketIdentifier) {
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

    ConnectionManager.prototype._removeFromCircuitNodesByIdentifier = function (identifier) {
        if (identifier) {
            var circNode = this._circuitNodes[identifier];

            if (circNode) {
                this._protocolConnectionManager.keepHydraSocketNoLongerOpen(identifier);
                delete this._circuitNodes[identifier];

                return circNode;
            }
        }

        return undefined;
    };

    ConnectionManager.prototype._setupListeners = function () {
        var _this = this;
        this._protocolConnectionManager.on('terminatedConnection', function (identifier) {
            var circuitNode = _this._removeFromCircuitNodesByIdentifier(identifier);

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
