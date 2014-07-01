var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* @class core.protocol.fileTransfer.TransferMessageCenter
* @extends events.EventEmitter
* @implements core.protocol.fileTransfer.TransferMessageCenterInterface
*/
var TransferMessageCenter = (function (_super) {
    __extends(TransferMessageCenter, _super);
    function TransferMessageCenter(circuitManager, cellManager, hydraMessageCenter, readableFileTransferMessageFactory, writableFileTransferMessageFactory, readableQueryResponseFactory, writableQueryResponseFactory) {
        _super.call(this);
        this._circuitManager = null;
        this._cellManager = null;
        this._hydraMessageCenter = null;
        this._readableFileTransferMessageFactory = null;
        this._writableFileTransferMessageFactory = null;
        this._readableQueryResponseMessageFactory = null;
        this._writableQueryResponseMessageFactory = null;

        this._circuitManager = circuitManager;
        this._cellManager = cellManager;
        this._hydraMessageCenter = hydraMessageCenter;

        this._readableFileTransferMessageFactory = readableFileTransferMessageFactory;
        this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;
        this._readableQueryResponseMessageFactory = readableQueryResponseFactory;
        this._writableQueryResponseMessageFactory = writableQueryResponseFactory;

        this._setupListeners();
    }
    TransferMessageCenter.prototype.wrapTransferMessage = function (messageType, transferId, payload) {
        try  {
            return this._writableFileTransferMessageFactory.constructMessage(transferId, messageType, payload);
        } catch (e) {
            return null;
        }
    };

    TransferMessageCenter.prototype._setupListeners = function () {
        var _this = this;
        this._circuitManager.on('circuitReceivedTransferMessage', function (circuitId, payload) {
            var msg = _this._readableFileTransferMessageFactory.create(payload);

            if (msg) {
                _this._onCircuitTransferMessage(circuitId, msg);
            } else {
                _this._circuitManager.teardownCircuit(circuitId);
            }
        });

        this._cellManager.on('cellReceivedTransferMessage', function (predecessorCircuitId, payload) {
            var msg = _this._readableFileTransferMessageFactory.create(payload);

            if (msg) {
                _this._onCellTransferMessage(predecessorCircuitId, msg);
            } else {
                _this._cellManager.teardownCell(predecessorCircuitId);
            }
        });

        this._hydraMessageCenter.on('regularFileTransferMsg', function (socketIdentifier, payload) {
            var msg = _this._readableFileTransferMessageFactory.create(payload);

            if (msg) {
                _this._onFedTransferMessage(socketIdentifier, msg);
            }
        });
    };

    TransferMessageCenter.prototype._onCircuitTransferMessage = function (circuitId, msg) {
        var messageType = msg.getMessageType();

        if (messageType === 'QUERY_RESPONSE') {
            var queryResponseMessage = this._readableQueryResponseMessageFactory.create(msg.getPayload());

            if (queryResponseMessage) {
                this.emit('QUERY_RESPONSE_' + msg.getTransferId(), queryResponseMessage);
            }
        }
    };

    TransferMessageCenter.prototype._onCellTransferMessage = function (predecessorCircuitId, msg) {
    };

    TransferMessageCenter.prototype._onFedTransferMessage = function (socketIdentifier, msg) {
    };
    return TransferMessageCenter;
})(events.EventEmitter);

module.exports = TransferMessageCenter;
//# sourceMappingURL=TransferMessageCenter.js.map
