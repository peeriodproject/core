var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

var HydraCell = (function (_super) {
    __extends(HydraCell, _super);
    function HydraCell(predecessorNode, hydraConfig, connectionManager, messageCenter, decryptionFactory, encryptionFactory) {
        _super.call(this);
        this._connectionManager = null;
        this._messageCenter = null;
        this._decrypter = null;
        this._encrypter = null;
        this._predecessor = null;
        this._successor = null;
        this._isTornDown = false;
        this._terminationListener = null;
        this._spitoutListener = null;
        this._digestListener = null;
        this._extensionListener = null;
        this._extensionReactionInMs = 0;
        this._currentExtensionUuid = null;
        this._currentExtensionTimeout = 0;
        this._extensionResponseListener = null;

        this._predecessor = predecessorNode;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._decrypter = decryptionFactory;
        this._encrypter = encryptionFactory;

        this._extensionReactionInMs = hydraConfig.get('cell.extensionReactionInSeconds') * 1000;

        this._setupListeners();
    }
    HydraCell.prototype._extendCellWith = function (ip, port, uuid, additivePayload) {
        var _this = this;
        var circuitId = crypto.pseudoRandomBytes(16).toString('hex');

        this._currentExtensionUuid = uuid;

        this._successor = {
            ip: ip,
            port: port,
            circuitId: circuitId
        };

        this._messageCenter.sendCreateCellAdditiveMessageAsInitiator(this._successor, circuitId, uuid, additivePayload);

        // set the timeout
        this._currentExtensionTimeout = global.setTimeout(function () {
            _this._currentExtensionTimeout = 0;
            _this._teardown(true, true);
        }, this._extensionReactionInMs);

        this._extensionResponseListener = function (from, msg) {
            _this._clearExtensionTimeout();
            _this._onExtensionResponse(from, msg);
        };

        this._messageCenter.on('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
    };

    HydraCell.prototype._onExtensionResponse = function (from, msg) {
        if (from === this._successor) {
            this._removeExtensionResponseListener();

            if (msg.getUUID() === this._currentExtensionUuid) {
                if (msg.isRejected()) {
                    var succ = this._successor;
                    this._successor = null;
                    this._connectionManager.removeFromCircuitNodes(succ);
                } else {
                    this._setupDigestListener();
                }

                this._initiateDigest('CELL_CREATED_REJECTED', msg);
            } else {
                this._teardown(true, true);
            }
        }
    };

    HydraCell.prototype._initiateDigest = function (messageType, msg) {
        var payload = this._messageCenter.getFullBufferOfMessage(messageType, msg);

        if (payload) {
            this._digestBuffer(payload, true);
        }
    };

    HydraCell.prototype._digestBuffer = function (buffer, isReceiver) {
        var _this = this;
        if (typeof isReceiver === "undefined") { isReceiver = false; }
        this._encrypter.encryptMessage(this._predecessor.outgoingKey, isReceiver, buffer, function (err, encrypted) {
            if (!err && encrypted) {
                _this._connectionManager.pipeCircuitMessageTo(_this._predecessor, 'ENCRYPTED_DIGEST', encrypted);
            }
        });
    };

    HydraCell.prototype._setupDigestListener = function () {
        var _this = this;
        this._digestListener = function (from, msg) {
            if (from === _this._successor) {
                _this._digestBuffer(msg.getPayload());
            }
        };

        this._messageCenter.on('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
    };

    HydraCell.prototype._setupListeners = function () {
        var _this = this;
        this._terminationListener = function (terminatedCircuitId) {
            _this._onCircuitTermination(terminatedCircuitId);
        };

        this._spitoutListener = function (from, msg) {
            if (from === _this._predecessor) {
                _this._onSpitoutMessage(msg);
            }
        };

        this._extensionListener = function (from, msg, decrypted) {
            if (from === _this._predecessor) {
                var createCellMsg = _this._messageCenter.unwrapAdditiveSharingPayload(msg);

                if (createCellMsg && decrypted && !_this._successor) {
                    _this._extendCellWith(msg.getIp(), msg.getPort(), createCellMsg.getUUID(), createCellMsg.getAdditivePayload());
                } else {
                    _this._teardown(true, true);
                }
            }
        };

        this._connectionManager.on('circuitTermination', this._terminationListener);
        this._messageCenter.on('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
        this._messageCenter.on('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);
    };

    HydraCell.prototype._removeExtensionResponseListener = function () {
        if (this._extensionResponseListener && this._successor) {
            this._messageCenter.removeListener('CELL_CREATED_REJECTED_' + this._successor.circuitId, this._extensionResponseListener);
            this._extensionResponseListener();
        }
    };

    HydraCell.prototype._removeListeners = function () {
        this._connectionManager.removeListener('circuitTermination', this._terminationListener);

        this._messageCenter.removeListener('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
        this._messageCenter.removeListener('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);

        this._spitoutListener = null;
        this._extensionListener = null;

        if (this._digestListener) {
            this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
            this._digestListener = null;
        }

        this._removeExtensionResponseListener();
    };

    HydraCell.prototype._onSpitoutMessage = function (message) {
        var decryptedMessage = this._decrypter.create(message.getPayload(), this._predecessor.incomingKey);

        if (decryptedMessage.isReceiver()) {
            this._messageCenter.forceCircuitMessageThrough(decryptedMessage.getPayload(), this._predecessor);
        } else if (this._successor && this._successor.socketIdentifier) {
            this._connectionManager.pipeCircuitMessageTo(this._successor, 'ENCRYPTED_SPITOUT', message.getPayload());
        } else {
            this._teardown(true, true);
        }
    };

    HydraCell.prototype._onCircuitTermination = function (terminatedCircuitId) {
        // tear down the circuit.
        if (this._predecessor.circuitId === terminatedCircuitId) {
            this._teardown(false, true);
        } else if (this._successor && this._successor.circuitId === terminatedCircuitId) {
            this._teardown(true, false);
        }
    };

    HydraCell.prototype._clearExtensionTimeout = function () {
        if (this._currentExtensionTimeout) {
            global.clearTimeout(this._currentExtensionTimeout);
            this._currentExtensionTimeout = 0;
        }
    };

    HydraCell.prototype._teardown = function (killPredecessor, killSuccessor) {
        if (!this._isTornDown) {
            this._isTornDown = true;

            this._removeListeners();
            this._clearExtensionTimeout();

            if (killPredecessor) {
                this._connectionManager.removeFromCircuitNodes(this._predecessor);
            }
            if (killSuccessor && this._successor) {
                this._connectionManager.removeFromCircuitNodes(this._successor);
            }

            this.emit('isTornDown');
        }
    };
    return HydraCell;
})(events.EventEmitter);

module.exports = HydraCell;
//# sourceMappingURL=HydraCell.js.map
