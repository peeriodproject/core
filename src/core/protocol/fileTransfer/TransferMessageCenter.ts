import events = require('events');

import TransferMessageCenterInterface = require('./interfaces/TransferMessageCenterInterface');
import ReadableFileTransferMessageInterface = require('./messages/interfaces/ReadableFileTransferMessageInterface');
import ReadableFileTransferMessageFactoryInterface = require('./messages/interfaces/ReadableFileTransferMessageFactoryInterface');
import WritableFileTransferMessageFactoryInterface = require('./messages/interfaces/WritableFileTransferMessageFactoryInterface');
import ReadableQueryResponseMessageFactoryInterface = require('./messages/interfaces/ReadableQueryResponseMessageFactoryInterface');
import ReadableQueryResponseMessageInterface = require('./messages/interfaces/ReadableQueryResponseMessageInterface');
import WritableQueryResponseMessageFactoryInterface = require('./messages/interfaces/WritableQueryResponseMessageFactoryInterface');
import CircuitManagerInterface = require('../hydra/interfaces/CircuitManagerInterface');
import CellManagerInterface = require('../hydra/interfaces/CellManagerInterface');
import HydraMessageCenterInterface = require('../hydra/interfaces/HydraMessageCenterInterface');
import HydraCircuitList = require('../hydra/interfaces/HydraCircuitList');
import HydraNodeList = require('../hydra/interfaces/HydraNodeList');
import HydraNode = require('../hydra/interfaces/HydraNode');
import HydraCircuitInterface = require('../hydra/interfaces/HydraCircuitInterface');
import FeedingNodesMessageBlock = require('./messages/FeedingNodesMessageBlock');
import MiddlewareInterface = require('./interfaces/MiddlewareInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');

var logger = require('../../utils/logger/LoggerFactory').create();

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
class TransferMessageCenter extends events.EventEmitter implements TransferMessageCenterInterface {

	/**
	 * Stores the hydra cell manager instance.
	 *
	 * @member {core.protocol.hydra.CellManagerInterface} core.protocol.fileTransfer.TransferMessageCenter~_cellManager
	 */
	private _cellManager:CellManagerInterface = null;

	/**
	 * Stores the hydra circuit manager instance.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.TransferMessageCenter~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Stores the hydra message center instance.
	 *
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.fileTransfer.TransferMessageCenter~_hydraMessageCenter
	 */
	private _hydraMessageCenter:HydraMessageCenterInterface = null;

	/**
	 * Stores the file transfer middleware instance.
	 *
	 * @member {core.protocol.fileTransfer.MiddlewareInterface} core.protocol.fileTransfer.TransferMessageCenter~_middleware
	 */
	private _middleware:MiddlewareInterface = null;

	/**
	 * Stores the protocol connection manager instance.
	 *
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.fileTransfer.TransferMessageCenter~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * Stores the factory for reading FILE_TRANSFER messages.
	 *
	 * @member {core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_readableFileTransferMessageFactory
	 */
	private _readableFileTransferMessageFactory:ReadableFileTransferMessageFactoryInterface = null;

	/**
	 * Stores the factory for reading QUERY_RESPONSE messages.
	 *
	 * @member {core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_readableQueryResponseMessageFactory
	 */
	private _readableQueryResponseMessageFactory:ReadableQueryResponseMessageFactoryInterface = null;

	/**
	 * Stores the factory for writing FILE_TRANSFER message payloads.
	 *
	 * @member {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_writableFileTransferMessageFactory
	 */
	private _writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface = null;

	/**
	 * Stores the factory for writing QUERY_RESPONSE messages.
	 *
	 * @member {core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface} core.protocol.fileTransfer.TransferMessageCenter~_writableQueryResponseMessageFactory
	 */
	private _writableQueryResponseMessageFactory:WritableQueryResponseMessageFactoryInterface = null;

	public constructor (protocolConnectionManager:ProtocolConnectionManagerInterface, middleware:MiddlewareInterface, circuitManager:CircuitManagerInterface, cellManager:CellManagerInterface, hydraMessageCenter:HydraMessageCenterInterface, readableFileTransferMessageFactory:ReadableFileTransferMessageFactoryInterface, writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface, readableQueryResponseFactory:ReadableQueryResponseMessageFactoryInterface, writableQueryResponseFactory:WritableQueryResponseMessageFactoryInterface) {
		super();

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

	public issueExternalFeedToCircuit (nodesToFeedBlock:Buffer, payload:Buffer, circuitId?:string):boolean {

		var wrappedMessage:Buffer = this.wrapTransferMessage('EXTERNAL_FEED', '00000000000000000000000000000000', Buffer.concat([nodesToFeedBlock, payload]));

		if (wrappedMessage && !(circuitId && this._circuitManager.pipeFileTransferMessageThroughCircuit(circuitId, wrappedMessage))) {
			return this._circuitManager.pipeFileTransferMessageThroughRandomCircuit(wrappedMessage);
		}

		return true;
	}

	public wrapTransferMessage (messageType:string, transferId:string, payload:Buffer):Buffer {

		try {
			return this._writableFileTransferMessageFactory.constructMessage(transferId, messageType, payload);
		}
		catch (e) {
			return null;
		}
	}

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
	private _onCellTransferMessage (predecessorCircuitId:string, msg:ReadableFileTransferMessageInterface):void {

		if (msg.getMessageType() === 'EXTERNAL_FEED') {
			var feedingNodesBlock:any = null;
			var slice:Buffer = null;
			var payload:Buffer = msg.getPayload();

			try {
				feedingNodesBlock = FeedingNodesMessageBlock.extractAndDeconstructBlock(payload);
				slice = payload.slice(feedingNodesBlock.bytesRead);
			}
			catch (e) {
				logger.log('middleware', 'Tearing down cell, message is wrong');
				this._cellManager.teardownCell(predecessorCircuitId);
			}

			if (feedingNodesBlock && slice) {
				this._middleware.feedNode(feedingNodesBlock.nodes, predecessorCircuitId, slice);
			}
		}
		else if (msg.getMessageType() === 'QUERY_BROADCAST') {

			var payload = msg.getPayload();
			var broadcastId:string = msg.getTransferId();
			var feedingNodesObj:any = null;
			var searchObject:Buffer = null;

			try {
				feedingNodesObj = FeedingNodesMessageBlock.extractAndDeconstructBlock(payload);
				searchObject = payload.slice(feedingNodesObj.bytesRead);
			}
			catch (e) {
			}

			if (searchObject && feedingNodesObj && searchObject.length && feedingNodesObj.nodes.length) {
				logger.log('query', 'Received QUERY_BROADCAST message', {queryId: broadcastId});
				this.emit('issueBroadcastQuery', predecessorCircuitId, broadcastId, searchObject, payload);
			}
			else {
				this._cellManager.teardownCell(predecessorCircuitId);
			}
		}
	}

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
	private _onCircuitTransferMessage (circuitId:string, msg:ReadableFileTransferMessageInterface):void {
		var messageType:string = msg.getMessageType();

		if (messageType === 'QUERY_RESPONSE') {
			var queryResponseMessage:ReadableQueryResponseMessageInterface = this._readableQueryResponseMessageFactory.create(msg.getPayload());

			if (queryResponseMessage) {
				this.emit('QUERY_RESPONSE_' + msg.getTransferId(), queryResponseMessage);
			}
		}
		else if (messageType === 'TEST_MESSAGE') {
			this.emit('testMessage', null, msg.getPayload().toString());
		}
	}

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
	private _onFedTransferMessage (socketIdentifier:string, msg:ReadableFileTransferMessageInterface):void {

		if (msg.getMessageType() === 'GOT_FED') {

			var predecessorCircuitId:string = this._cellManager.getCircuitIdByFeedingIdentifier(msg.getTransferId());

			if (predecessorCircuitId) {
				logger.log('middleware', 'Got fed');

				this._cellManager.pipeFileTransferMessage(predecessorCircuitId, msg.getPayload());
				this._middleware.addIncomingSocket(predecessorCircuitId, socketIdentifier);
			}
			else {
				this._middleware.closeSocketByIdentifier(socketIdentifier);
			}
		}
	}

	/**
	 * Sets up the listeners for message that come throuhg circuits, cells, or regular sockets, related to fileTransfer.
	 *
	 * @method core.protocol.fileTransfer.TransferMessageCenter~_setupListeners
	 */
	private _setupListeners ():void {

		this._circuitManager.on('circuitReceivedTransferMessage', (circuitId:string, payload:Buffer) => {
			var msg:ReadableFileTransferMessageInterface = this._readableFileTransferMessageFactory.create(payload);

			if (msg) {
				this._onCircuitTransferMessage(circuitId, msg);
			}
			else {
				this._circuitManager.teardownCircuit(circuitId);
			}
		});

		this._cellManager.on('cellReceivedTransferMessage', (predecessorCircuitId:string, payload:Buffer) => {

			var msg:ReadableFileTransferMessageInterface = this._readableFileTransferMessageFactory.create(payload);

			if (msg) {
				this._onCellTransferMessage(predecessorCircuitId, msg);
			}
			else {
				this._cellManager.teardownCell(predecessorCircuitId);
			}
		});

		this._hydraMessageCenter.on('regularFileTransferMsg', (socketIdentifier:string, payload:Buffer) => {
			var msg:ReadableFileTransferMessageInterface = this._readableFileTransferMessageFactory.create(payload);

			if (msg) {
				this._onFedTransferMessage(socketIdentifier, msg);
			}
		});
	}
}

export = TransferMessageCenter;
