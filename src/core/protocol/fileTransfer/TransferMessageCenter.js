var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var FeedingNodesMessageBlock = require('./messages/FeedingNodesMessageBlock');

/**
* @class core.protocol.fileTransfer.TransferMessageCenter
* @extends events.EventEmitter
* @implements core.protocol.fileTransfer.TransferMessageCenterInterface
*/
var TransferMessageCenter = (function (_super) {
    __extends(TransferMessageCenter, _super);
    function TransferMessageCenter(protocolConnectionManager, middleware, circuitManager, cellManager, hydraMessageCenter, readableFileTransferMessageFactory, writableFileTransferMessageFactory, readableQueryResponseFactory, writableQueryResponseFactory) {
        _super.call(this);
        this._circuitManager = null;
        this._cellManager = null;
        this._hydraMessageCenter = null;
        this._protocolConnectionManager = null;
        this._readableFileTransferMessageFactory = null;
        this._writableFileTransferMessageFactory = null;
        this._readableQueryResponseMessageFactory = null;
        this._writableQueryResponseMessageFactory = null;
        this._middleware = null;

        this._circuitManager = circuitManager;
        this._cellManager = cellManager;
        this._hydraMessageCenter = hydraMessageCenter;
        this._protocolConnectionManager = protocolConnectionManager;

        this._middleware = middleware;

        this._readableFileTransferMessageFactory = readableFileTransferMessageFactory;
        this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;
        this._readableQueryResponseMessageFactory = readableQueryResponseFactory;
        this._writableQueryResponseMessageFactory = writableQueryResponseFactory;

        this._setupListeners();
    }
    TransferMessageCenter.prototype.issueExternalFeedToCircuit = function (nodesToFeedBlock, payload, circuitId) {
        var wrappedMessage = this.wrapTransferMessage('EXTERNAL_FEED', '00000000000000000000000000000000', Buffer.concat([nodesToFeedBlock, payload]));

        if (!(circuitId && this._circuitManager.pipeFileTransferMessageThroughCircuit(circuitId, wrappedMessage))) {
            return this._circuitManager.pipeFileTransferMessageThroughRandomCircuit(wrappedMessage);
        }

        return true;
    };

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
        } else if (messageType === 'TEST_MESSAGE') {
            this.emit('testMessage', null, msg.getPayload().toString());
        }
    };

    TransferMessageCenter.prototype._onCellTransferMessage = function (predecessorCircuitId, msg) {
        if (msg.getMessageType() === 'EXTERNAL_FEED') {
            var feedingNodesBlock = null;
            var slice = null;
            var payload = msg.getPayload();

            try  {
                feedingNodesBlock = FeedingNodesMessageBlock.extractAndDeconstructBlock(payload);
                slice = payload.slice(feedingNodesBlock.bytesRead);
            } catch (e) {
                this._cellManager.teardownCell(predecessorCircuitId);
            }

            if (feedingNodesBlock && slice) {
                this._middleware.feedNode(feedingNodesBlock.nodes, predecessorCircuitId, slice);
            }
        } else if (msg.getMessageType() === 'QUERY_BROADCAST') {
            var searchObject = msg.getPayload();
            var broadcastId = msg.getTransferId();
            var feedingIdentifier = this._cellManager.getFeedingIdentifierByCircuitId(predecessorCircuitId);
            var externalAddress = this._protocolConnectionManager.getRandomExternalIpPortPair();

            if (feedingIdentifier && externalAddress) {
                externalAddress.feedingIdentifier = feedingIdentifier;
                var myFeedingBlock = FeedingNodesMessageBlock.constructBlock([externalAddress]);

                this.emit('issueBroadcastQuery', predecessorCircuitId, broadcastId, searchObject, myFeedingBlock);
            } else {
                this._cellManager.teardownCell(predecessorCircuitId);
            }
        }
    };

    TransferMessageCenter.prototype._onFedTransferMessage = function (socketIdentifier, msg) {
        if (msg.getMessageType() === 'GOT_FED') {
            var predecessorCircuitId = this._cellManager.getCircuitIdByFeedingIdentifier(msg.getTransferId());

            if (predecessorCircuitId) {
                this._cellManager.pipeFileTransferMessage(predecessorCircuitId, msg.getPayload());
                this._middleware.addIncomingSocket(predecessorCircuitId, socketIdentifier);
            } else {
                this._middleware.closeSocketByIdentifier(socketIdentifier);
            }
        }
    };
    return TransferMessageCenter;
})(events.EventEmitter);

module.exports = TransferMessageCenter;
//# sourceMappingURL=TransferMessageCenter.js.map
