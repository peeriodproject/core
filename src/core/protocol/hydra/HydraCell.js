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

        this._connectionManager.on('circuitTermination', this._terminationListener);
    };

    HydraCell.prototype._removeListeners = function () {
        this._connectionManager.removeListener('circuitTermination', this._terminationListener);
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
        if (killSuccessor) {
            if (this._successor) {
                this._connectionManager.removeFromCircuitNodes(this._successor);
            }
        }

        this.emit('isTornDown');
    };
    return HydraCell;
})(events.EventEmitter);

module.exports = HydraCell;
//# sourceMappingURL=HydraCell.js.map
