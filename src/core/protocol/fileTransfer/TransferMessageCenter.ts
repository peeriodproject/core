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

/**
 * @class core.protocol.fileTransfer.TransferMessageCenter
 * @extends events.EventEmitter
 * @implements core.protocol.fileTransfer.TransferMessageCenterInterface
 */
class TransferMessageCenter extends events.EventEmitter implements TransferMessageCenterInterface {

	private _circuitManager:CircuitManagerInterface = null;
	private _cellManager:CellManagerInterface = null;
	private _hydraMessageCenter:HydraMessageCenterInterface = null;
	private _readableFileTransferMessageFactory:ReadableFileTransferMessageFactoryInterface = null;
	private _writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface = null;
	private _readableQueryResponseMessageFactory:ReadableQueryResponseMessageFactoryInterface = null;
	private _writableQueryResponseMessageFactory:WritableQueryResponseMessageFactoryInterface = null;

	private _feedingNodesBlock:Buffer = null;
	private _feedingNodesBlockLength:number = 0;

	private _middleware:MiddlewareInterface = null;

	public constructor (middleware:MiddlewareInterface, circuitManager:CircuitManagerInterface, cellManager:CellManagerInterface, hydraMessageCenter:HydraMessageCenterInterface, readableFileTransferMessageFactory:ReadableFileTransferMessageFactoryInterface, writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface, readableQueryResponseFactory:ReadableQueryResponseMessageFactoryInterface, writableQueryResponseFactory:WritableQueryResponseMessageFactoryInterface) {
		super();

		this._circuitManager = circuitManager;
		this._cellManager = cellManager;
		this._hydraMessageCenter = hydraMessageCenter;

		this._middleware = middleware;

		this._readableFileTransferMessageFactory = readableFileTransferMessageFactory;
		this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;
		this._readableQueryResponseMessageFactory = readableQueryResponseFactory;
		this._writableQueryResponseMessageFactory = writableQueryResponseFactory;

		this._setupListeners();
	}

	public issueExternalFeedToCircuit (nodesToFeedBlock:Buffer, payload:Buffer, circuitId?:string):boolean {

		var wrappedMessage:Buffer = this.wrapTransferMessage('EXTERNAL_FEED', '00000000000000000000000000000000', Buffer.concat([nodesToFeedBlock, payload], this._feedingNodesBlockLength + payload.length));

		if (!(circuitId && this._circuitManager.pipeFileTransferMessageThroughCircuit(circuitId, wrappedMessage))) {
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
				this._cellManager.teardownCell(predecessorCircuitId);
			}

			if (feedingNodesBlock && slice) {

				this._middleware.feedNode(feedingNodesBlock.nodes, predecessorCircuitId, slice);
			}
		}
	}

	private _onFedTransferMessage (socketIdentifier:string, msg:ReadableFileTransferMessageInterface):void {

		if (msg.getMessageType() === 'GOT_FED') {

			var predecessorCircuitId:string = this._cellManager.getCircuitIdByFeedingIdentifier(msg.getTransferId());

			if (predecessorCircuitId) {
				this._cellManager.pipeFileTransferMessage(predecessorCircuitId, msg.getPayload());
				this._middleware.addIncomingSocket(predecessorCircuitId, socketIdentifier);
			}
			else {
				this._middleware.closeSocketByIdentifier(socketIdentifier);
			}
		}
	}
}

export = TransferMessageCenter;
