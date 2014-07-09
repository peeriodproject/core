var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var FeedingNodesMessageBlock = require('./messages/FeedingNodesMessageBlock');

/**
* TransferMessageCenterInterface implementation.
*
* @class core.protocol.fileTransfer.TransferMessageCenter
* @extends events.EventEmitter
* @implements core.protocol.fileTransfer.TransferMessageCenterInterface
*
* @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager The protocol connection manager instance of this client.
* @param {core.protocol.fileTransfer.MiddlewareInterface} middleware The middleware instance of this client
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Hydra circuit manager instance.
* @param {core.protocol.hydra.CellManagerInterface} cellManager Hydra cell manager instance.
* @param {core.protocol.hydra.HydraMessageCenterInterface} hydraMessageCenter Hydra message center instance.
* @param {core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface} readableFileTransferMessageFactory Factory for reading FILE_TRANSFER messages.
* @param {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} writableFileTransferMessageFactory Factory for writing FILE_TRANSFER message payloads.
* @param {core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface} readableQueryResponseFactory Factory for reading QUERY_RESPONSE messsages.
* @param {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} writableQueryResponseFactory Factory for writing QUERY_RESPONSE message payloads.
*/
var TransferMessageCenter = (function (_super) {
    __extends(TransferMessageCenter, _super);
    function TransferMessageCenter(protocolConnectionManager, middleware, circuitManager, cellManager, hydraMessageCenter, readableFileTransferMessageFactory, writableFileTransferMessageFactory, readableQueryResponseFactory, writableQueryResponseFactory) {
        _super.call(this);
        /**
        * Stores the hydra cell manager instance.
        *
        * @member {core.protocol.hydra.CellManagerInterface} core.protocol.fileTransfer.TransferMessageCenter~_cellManager
        */
        this._cellManager = null;
        /**
        * Stores the hydra circuit manager instance.
        *
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.TransferMessageCenter~_circuitManager
        */
        this._circuitManager = null;
        /**
        * Stores the hydra message center instance.
        *
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.fileTransfer.TransferMessageCenter~_hydraMessageCenter
        */
        this._hydraMessageCenter = null;
        /**
        * Stores the file transfer middleware instance.
        *
        * @member {core.protocol.fileTransfer.MiddlewareInterface} core.protocol.fileTransfer.TransferMessageCenter~_middleware
        */
        this._middleware = null;
        /**
        * Stores the protocol connection manager instance.
        *
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.fileTransfer.TransferMessageCenter~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * Stores the factory for reading FILE_TRANSFER messages.
        *
        * @member {core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_readableFileTransferMessageFactory
        */
        this._readableFileTransferMessageFactory = null;
        /**
        * Stores the factory for reading QUERY_RESPONSE messages.
        *
        * @member {core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_readableQueryResponseMessageFactory
        */
        this._readableQueryResponseMessageFactory = null;
        /**
        * Stores the factory for writing FILE_TRANSFER message payloads.
        *
        * @member {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_writableFileTransferMessageFactory
        */
        this._writableFileTransferMessageFactory = null;
        /**
        * Stores the factory for writing QUERY_RESPONSE messages.
        *
        * @member {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_writableQueryResponseMessageFactory
        */
        this._writableQueryResponseMessageFactory = null;

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

    /**
    * Function that gets called when this node receives a message as one of the relay nodes of a circuit.
    *
    * EXTERNAL_FEED: Unwrap the feeding block and the payload, and feed the nodes in the block via middleware.
    *
    * QUERY_BROADCAST: Prepend this node's own address to the message block and emit a 'issueBroadcastQuery' Event
    * in order to start a new broadcast.
    *
    * @method core.protocol.fileTransfer.TransferMessageCenter~_onCellTransfer
    *
    * @param {string} predecessorCircuitId The circuit identifier shared with the predecessor of the circuit this node is part of.
    * @param {core.protocol.fileTransfer.ReadableFileTransferMessageInterface} msg The received FILE_TRANSFER message.
    */
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

    /**
    * Method that gets called when this node receives a message through a circuit which it is initiator of.
    *
    * QUERY_RESPONSE: Emit a QUERY_RESPONSE event concatenated with the transfer identifier of the message, as this is
    * generally equal to the query identifier of the underlying query. Pass in the unwrapped query response message as argument.
    *
    * TEST_MESSAGE: Only for testing purposes, emit 'testMessage' event
    *
    * @param {string} circuitId The identifier of the circuit through which the message came.
    * @param {core.protocol.fileTransfer.ReadableFileTransferMessageInterface} msg The received message.
    */
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

    /**
    * This method gets called when a FILE_TRANSFER message rolls in through a socket that is not related to any
    * existing circuit / cell.
    *
    * GOT_FED: Treat the transferId of the message as feedingIdentifier and look for the appropriate circuit. Then
    * pipe back the payload of the message through the circuit.
    *
    * @method core.protocol.fileTransfer.TransferMessageCenter~_onFedTransferMessage
    *
    * @param {string} socketIdentifier The identifier of the socket the message came through
    * @param {core.protocol.fileTransfer.ReadableFileTransferMessageInterface} msg The received message
    */
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

    /**
    * Sets up the listeners for message that come throuhg circuits, cells, or regular sockets, related to fileTransfer.
    *
    * @method core.protocol.fileTransfer.TransferMessageCenter~_setupListeners
    */
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
    return TransferMessageCenter;
})(events.EventEmitter);

module.exports = TransferMessageCenter;
//# sourceMappingURL=TransferMessageCenter.js.map
