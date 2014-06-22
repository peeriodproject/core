var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraCell = (function (_super) {
    __extends(HydraCell, _super);
    function HydraCell(predecessorNode, connectionManager, messageCenter, decryptionFactory, encryptionFactory) {
        _super.call(this);
        this._connectionManager = null;
        this._messageCenter = null;
        this._decrypter = null;
        this._encrypter = null;
        this._predecessor = null;
        this._successor = null;
        this._terminationListener = null;
        this._spitoutListener = null;
        this._digestListener = null;
        this._extensionListener = null;

        this._predecessor = predecessorNode;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._decrypter = decryptionFactory;
        this._encrypter = encryptionFactory;

        this._setupListeners();
    }
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
                if (decrypted && !_this._successor) {
                    // extend cell
                    // @todo
                } else {
                    _this._teardown(true, true);
                }
            }
        };

        this._connectionManager.on('circuitTermination', this._terminationListener);
        this._messageCenter.on('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
        this._messageCenter.on('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);
    };

    HydraCell.prototype._removeListeners = function () {
        this._connectionManager.removeListener('circuitTermination', this._terminationListener);

        this._messageCenter.removeListener('ENCRYPTED_SPITOUT_' + this._predecessor.circuitId, this._spitoutListener);
        this._messageCenter.removeListener('ADDITIVE_SHARING_' + this._predecessor.circuitId, this._extensionListener);

        if (this._digestListener) {
            this._messageCenter.removeListener('ENCRYPTED_DIGEST_' + this._successor.circuitId, this._digestListener);
        }
    };

    HydraCell.prototype._onSpitoutMessage = function (message) {
        var decryptedMessage = this._decrypter.create(message.getPayload(), this._predecessor.incomingKey);

        if (decryptedMessage.isReceiver()) {
            this._messageCenter.forceCircuitMessageThrough(decryptedMessage.getPayload(), this._predecessor);
        } else if (this._successor) {
            this._connectionManager.pipeCircuitMessageTo(this._successor, 'ENCRYPTED_SPITOUT', message.getPayload());
        } else {
            this._teardown(true, false);
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

    HydraCell.prototype._teardown = function (killPredecessor, killSuccessor) {
        this._removeListeners();

        if (killPredecessor) {
            this._connectionManager.removeFromCircuitNodes(this._predecessor);
        }
        if (killSuccessor && this._successor) {
            this._connectionManager.removeFromCircuitNodes(this._successor);
        }

        this.emit('isTornDown');
    };
    return HydraCell;
})(events.EventEmitter);

module.exports = HydraCell;
//# sourceMappingURL=HydraCell.js.map
