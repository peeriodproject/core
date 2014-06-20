var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraCircuit = (function (_super) {
    __extends(HydraCircuit, _super);
    function HydraCircuit(hydraConfig, numOfRelayNodes, nodePicker, messageCenter, connectionManager, layeredEncDecFactory, circuitExtenderFactory) {
        _super.call(this);
        this._numOfRelayNodes = 0;
        this._nodePicker = null;
        this._messageCenter = null;
        this._connectionManager = null;
        this._maximumExtensionRetries = 0;
        this._circuitExtender = null;
        this._constructed = false;
        this._isTornDown = false;
        this._nodesToExtendWith = null;
        this._extensionRetryCount = 0;
        this._circuitId = null;
        this._layeredEncDecHandler = null;
        this._terminationListener = null;
        this._digestListener = null;

        this._numOfRelayNodes = numOfRelayNodes;
        this._nodePicker = nodePicker;
        this._messageCenter = messageCenter;
        this._connectionManager = connectionManager;
        this._layeredEncDecHandler = layeredEncDecFactory.create();
        this._circuitNodes = this._layeredEncDecHandler.getNodes();
        this._circuitExtender = circuitExtenderFactory.create(hydraConfig.get('hydra.circuit.extensionReactionTimeBaseInSeconds') * 1000, hydraConfig.get('hydra.circuit.extensionReactionTimeFactor'), this._layeredEncDecHandler);
        this._maximumExtensionRetries = hydraConfig.get('hydra.circuit.maximumExtensionRetries');

        this._construct();
    }
    HydraCircuit.prototype._construct = function () {
        var _this = this;
        this._nodePicker.pickRelayNodeBatch(function (batch) {
            _this._nodesToExtendWith = batch;

            _this._extensionCycle();
        });
    };

    HydraCircuit.prototype._extensionCycle = function (retryNode) {
        var _this = this;
        if (retryNode) {
            this._extensionRetryCount++;
        }

        var nodeToExtendWith = retryNode ? retryNode : this._nodesToExtendWith.shift();

        this._nodePicker.pickNextAdditiveNodeBatch(function (batch) {
            _this._circuitExtender.extend(nodeToExtendWith, batch, function (err, isRejected, newNode) {
                // successful
                if (newNode) {
                    _this._extensionRetryCount = 0;

                    var circuitNodesLength = _this._circuitNodes.length;

                    if (circuitNodesLength === 1) {
                        // the first node, setup the listeners
                        _this._setupListeners();
                    }

                    if (circuitNodesLength === _this._numOfRelayNodes) {
                        // all done, finalize
                        _this._constructed = true;
                        _this.emit('isConstructed');
                    } else {
                        _this._extensionCycle();
                    }
                } else if (isRejected) {
                    if (_this._extensionRetryCount === _this._maximumExtensionRetries) {
                        _this._teardown(true);
                    } else {
                        _this._nodePicker.pickAdditionalRelayNode(function (node) {
                            _this._extensionCycle(node);
                        });
                    }
                } else if (err) {
                    _this._teardown(err.message.indexOf('Circuit socket terminated') === -1);
                }
            });
        });
    };

    HydraCircuit.prototype._setupListeners = function () {
        var _this = this;
        this._circuitId = this._circuitNodes[0].circuitId;

        if (!this._circuitId) {
            throw new Error('Node does not have a circuit ID. This may never ever happen, yo! Something went very very wrong');
        }

        this._terminationListener = function (circuitId) {
            if (circuitId === _this._circuitId) {
                _this._teardown(false);
            }
        };

        this._digestListener = function (from, msg) {
            _this._onEncryptedDigest(from, msg);
        };

        this._connectionManager.on('circuitTermination', this._terminationListener);
        this._messageCenter.on('ENCRYPTED_DIGEST_' + this._circuitId, this._digestListener);
    };

    HydraCircuit.prototype._onEncryptedDigest = function (from, message) {
        var _this = this;
        if (from === this._circuitNodes[0]) {
            this._layeredEncDecHandler.decrypt(message.getPayload(), function (err, decryptedBuffer) {
                if (err) {
                    _this._teardown(true);
                } else if (decryptedBuffer) {
                    _this._messageCenter.forceCircuitMessageThrough(decryptedBuffer, from);
                }
            });
        }
    };

    HydraCircuit.prototype._removeEventListeners = function () {
        this._connectionManager.removeListener('circuitTermination', this._terminationListener);
        this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._circuitId, this._digestListener);
    };

    HydraCircuit.prototype._teardown = function (closeSocket) {
        if (!this._isTornDown) {
            this._isTornDown = true;

            this._removeEventListeners();

            if (closeSocket && this._circuitNodes.length) {
                this._connectionManager.removeFromCircuitNodes(this._circuitNodes[0]);
            }

            this.emit('isTornDown');
        }
    };
    return HydraCircuit;
})(events.EventEmitter);

module.exports = HydraCircuit;
//# sourceMappingURL=HydraCircuit.js.map
