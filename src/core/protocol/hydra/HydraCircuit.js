var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
* HydraCircuitInterface implementation
*
* @class core.protocol.hydra.HydraCircuit
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.HydraCircuitInterface
*
* @param {core.config.ConfigInterface} hydraConfig Hydra configuration
* @param {number} numOfRelayNodes The number of desired circuit nodes this circuit should expand to.
* @param {core.protocol.hydra.NodePickerInterface} nodePicker A usable NodePicker instance with similar configuration.
* @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter A working message center instance.
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
* @param {core.protocol.hydra.LayeredEncDecHandlerFactoryInterface} layeredEncDecFactory A factory for creating a fresh layered encryption/decryption handler (corresponding construction)
* @param {core.protocol.hydra.CircuitExtenderFactoryInterface} circuitExtenderFactory A circuit extender factory (correspoding construction)
*/
var HydraCircuit = (function (_super) {
    __extends(HydraCircuit, _super);
    function HydraCircuit(hydraConfig, numOfRelayNodes, nodePicker, messageCenter, connectionManager, layeredEncDecFactory, circuitExtenderFactory) {
        _super.call(this);
        /**
        * Stores this instance's circuit extender.
        *
        * @member {core.protocol.hydra.CircuitExtenderInterface} core.protocol.hydra.HydraCircuit~_circuitExtender
        */
        this._circuitExtender = null;
        /**
        * Stores this circuit's circuit ID shared with the first node. Gets populated once the first extension has been
        * completed.
        *
        * @member {string} core.protocol.hydra.HydraCircuit~_circuitId
        */
        this._circuitId = null;
        /**
        * The working connection manager instance.
        *
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCircuit~_connectionManager
        */
        this._connectionManager = null;
        /**
        * Flag indicating whether the circuit has been fully constructed, i.e. the number of active relay nodes equals
        * the number of desired relay nodes.
        *
        * @member {boolean} core.protocol.hydra.HydraCircuit~_constructed
        */
        this._constructed = false;
        /**
        * Stores the listener function on the ENCRYPTED_DIGEST event emitted by the message center.
        *
        * @member {Function} core.protocol.hydra.HydraCircuit~_digestListener
        */
        this._digestListener = null;
        /**
        * Keeps track of the number of retries in one extension cycle. Gets reset to zero as soon as the extension
        * succeeded.
        *
        * @member {number} core.protocol.hydra.HydraCircuit~_extensionRetryCount
        */
        this._extensionRetryCount = 0;
        /**
        * Stores the listener on the message center's FILE_TRANSFER message events
        *
        * @member {Function} core.protocol.hydra.HydraCircuit~_fileTransferListener
        */
        this._fileTransferListener = null;
        /**
        * Flag indicating whether this circuit is torn down and is thus unusable.
        * Also used for preventing multiple teardowns.
        *
        * @member {boolean) core.protocol.hydra.HydraCircuit~_isTornDown
        */
        this._isTornDown = false;
        /**
        * Stores the layered encryption/decryption handler for this circuit, and is kind of the heart of the circuit.
        *
        * @member {core.protocol.hydra.LayeredEncDecHandlerInterface) core.protocol.hydra.HydraCircuit~_layeredEncDecHandler
        */
        this._layeredEncDecHandler = null;
        /**
        * The number of maximum retries per extension cycle until the circuit is torn down.
        *
        * @member {number) core.protocol.hydra.HydraCircuit~_maximumExtensionRetries
        */
        this._maximumExtensionRetries = 0;
        /**
        * The working message center.
        *
        * @member {core.protocol.hydra.HydraMessageCenterInterface) core.protocol.hydra.HydraCircuit~_messageCenter
        */
        this._messageCenter = null;
        /**
        * The NodePicker used for choosing relay nodes and additive nodes.
        *
        * @member {core.protocol.hydra.NodePickerInterface) core.protocol.hydra.HydraCircuit~_nodePicker
        */
        this._nodePicker = null;
        /**
        * Stores the array of relay nodes chosen by the node picker.
        *
        * @member {core.protocol.hydra.HydraNodeList) core.protocol.hydra.HydraCircuit~_nodesToExtendWith
        */
        this._nodesToExtendWith = null;
        /**
        * The desired number of relay nodes this circuit should strive for.
        *
        * @member {number) core.protocol.hydra.HydraCircuit~_numOfRelayNodes
        */
        this._numOfRelayNodes = 0;
        /**
        * Stores the listener on the connection manager's 'circuitTermination' event.
        *
        * @member {Function} core.protocol.hydra.HydraCircuit~_terminationListener
        */
        this._terminationListener = null;
        // TESTING ONLY
        this.alsoClosedSocket = false;

        this._numOfRelayNodes = numOfRelayNodes;
        this._nodePicker = nodePicker;
        this._messageCenter = messageCenter;
        this._connectionManager = connectionManager;
        this._layeredEncDecHandler = layeredEncDecFactory.create();
        this._circuitNodes = this._layeredEncDecHandler.getNodes();
        this._circuitExtender = circuitExtenderFactory.create(hydraConfig.get('hydra.circuit.extensionReactionTimeBaseInSeconds') * 1000, hydraConfig.get('hydra.circuit.extensionReactionTimeFactor'), this._layeredEncDecHandler);
        this._maximumExtensionRetries = hydraConfig.get('hydra.circuit.maximumExtensionRetries');

        logger.log('hydra', 'New circuit initiated.', { numberOfNodes: this._numOfRelayNodes });
    }
    /**
    * BEGIN TESTING PURPOSES
    */
    HydraCircuit.prototype.getLayeredEncDec = function () {
        return this._layeredEncDecHandler;
    };

    /**
    * END TESTING PURPOSES
    */
    HydraCircuit.prototype.construct = function () {
        var _this = this;
        this._nodePicker.pickRelayNodeBatch(function (batch) {
            logger.log('hydra', 'Picked a batch of relay nodes', { nodes: batch });

            _this._nodesToExtendWith = batch;

            _this._extensionCycle();
        });
    };

    HydraCircuit.prototype.getCircuitId = function () {
        return this._circuitId;
    };

    HydraCircuit.prototype.getCircuitNodes = function () {
        return this._circuitNodes;
    };

    HydraCircuit.prototype.sendFileMessage = function (payload, earlyExit) {
        if (this._constructed && !this._isTornDown) {
            this._messageCenter.spitoutFileTransferMessage(this._layeredEncDecHandler, payload, earlyExit);
        }
    };

    HydraCircuit.prototype.teardown = function () {
        this._teardown(true);
    };

    /**
    * Extends the circuit by one node (at least tries so) and handles the response appropriately
    * (error => teardown, rejection => try again if retries left, else teardown, success => extend further or finalize)
    *
    * @method core.protocol.hydra.HydraCircuit~_extensionCycle
    *
    * @param {core.protocol.hydra.HydraNode} retryNode An optional node to retry the extension with. If this is set, the node
    * to extend with is not picked from the `_nodesToExtendWith` array.
    */
    HydraCircuit.prototype._extensionCycle = function (retryNode) {
        var _this = this;
        if (retryNode) {
            this._extensionRetryCount++;
        }

        var nodeToExtendWith = retryNode ? retryNode : this._nodesToExtendWith.shift();

        logger.log('hydra', 'Trying to extend circuit with node', { node: nodeToExtendWith });

        this._nodePicker.pickNextAdditiveNodeBatch(function (batch) {
            logger.log('hydra', 'Picked an additive batch of nodes for the extension. Extending...', { additiveBath: batch });

            _this._circuitExtender.extend(nodeToExtendWith, batch, function (err, isRejected, newNode) {
                logger.log('hydra', 'The extension has been processed');

                // successful
                if (newNode) {
                    logger.log('hydra', 'Extension was successful. New node is:', { node: newNode });

                    _this._extensionRetryCount = 0;

                    var circuitNodesLength = _this._circuitNodes.length;

                    if (circuitNodesLength === 1) {
                        // the first node, setup the listeners
                        _this._setupListeners();
                    }

                    if (circuitNodesLength === _this._numOfRelayNodes) {
                        logger.log('hydra', 'Circuit has been fully constructed', { circuitId: _this.getCircuitId() });

                        // all done, finalize
                        _this._constructed = true;
                        _this._setupFileTransferListener();
                        _this.emit('isConstructed');
                    } else {
                        _this._extensionCycle();
                    }
                } else if (isRejected) {
                    logger.log('hydra', 'Extension was rejected by the target node');

                    if (_this._extensionRetryCount === _this._maximumExtensionRetries) {
                        logger.log('hydra', 'Too many rejections, tearing down circuit.');
                        _this._teardown(true);
                    } else {
                        _this._nodePicker.pickAdditionalRelayNode(function (node) {
                            logger.log('hydra', 'Trying again node with new relay node', { newNode: node });
                            _this._extensionCycle(node);
                        });
                    }
                } else if (err) {
                    logger.log('hydra', 'Extension rendered an error. Circuit is tearing down', { error: err.message });

                    _this._teardown(err.message.indexOf('Circuit socket terminated') === -1);
                }
            });
        });
    };

    /**
    * Message listener on ENCRYPTED_DIGEST messages. Tries to decrypt the message and forces it back to the message
    * center so it can further unwrap the message and act accordingly.
    *
    * @method core.protocol.hydra.HydraCircuit~_onEncryptedDigest
    *
    * @param {core.protocol.hydra.HydraNode} from The originating node.
    * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The hydra message with encrypted payload.
    */
    HydraCircuit.prototype._onEncryptedDigest = function (from, message) {
        var _this = this;
        if (from === this._circuitNodes[0]) {
            this._layeredEncDecHandler.decrypt(message.getPayload(), function (err, decryptedBuffer) {
                if (err) {
                    _this._teardown(true);
                } else if (decryptedBuffer && !_this._isTornDown) {
                    _this._messageCenter.forceCircuitMessageThrough(decryptedBuffer, from);
                }
            });
        }
    };

    /**
    * Removes the event listeners from the connection manager and the message center.
    *
    * @method core.protocol.hydra.HydraCircuit~_removeEventListeners
    */
    HydraCircuit.prototype._removeEventListeners = function () {
        if (this._circuitId) {
            this._connectionManager.removeListener('circuitTermination', this._terminationListener);
            this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._circuitId, this._digestListener);

            if (this._fileTransferListener) {
                this._messageCenter.removeListener('FILE_TRANSFER_' + this._circuitId, this._fileTransferListener);
                this._fileTransferListener = null;
            }
        }
    };

    /**
    * Sets up the listener on the message center's FILE_TRANSFER event. This is only bound when the construction
    * of the circuit has been completed and is unbound on tearing down the circuit.
    *
    * @method core.protocol.hydra.HydraCircuit~_setupFileTransferListener
    */
    HydraCircuit.prototype._setupFileTransferListener = function () {
        var _this = this;
        this._fileTransferListener = function (from, msg, decrypted) {
            if (from === _this._circuitNodes[0]) {
                if (decrypted) {
                    _this.emit('fileTransferMessage', _this._circuitId, msg.getPayload());
                } else {
                    _this._teardown(true);
                }
            }
        };

        this._messageCenter.on('FILE_TRANSFER_' + this._circuitId, this._fileTransferListener);
    };

    /**
    * Sets up the listeners on the connection manager and the message center.
    * This function gets called as soon as the circuit has been extended with a first node. (thus has nodes at all, man!)
    *
    * @method core.protocol.hydra.HydraCircuit~_setupListeners
    */
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

    /**
    * Tears down the socket and thus renders it unusable.
    *
    * @method core.protocol.hydra.HydraCircuit~_teardown
    *
    * @param {boolean} closeSocket If true, the socket assigned to the first circuit node is closed and cleaned up by the connection manager.
    */
    HydraCircuit.prototype._teardown = function (closeSocket) {
        if (!this._isTornDown) {
            logger.log('hydra', 'Tearing down circuit.');
            this._isTornDown = true;

            this._removeEventListeners();

            if (closeSocket && this._circuitNodes.length) {
                // Testing only
                this.alsoClosedSocket = true;

                this._connectionManager.removeFromCircuitNodes(this._circuitNodes[0]);
            }

            this.emit('isTornDown');
        } else {
            logger.log('hydra', 'Circuit has already been torn down. Ignoring.');
        }
    };
    return HydraCircuit;
})(events.EventEmitter);

module.exports = HydraCircuit;
//# sourceMappingURL=HydraCircuit.js.map
