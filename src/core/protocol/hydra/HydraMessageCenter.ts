import events = require('events');

import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');

// messages
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');
import ReadableCellCreatedRejectedMessageFactoryInterface = require('./messages/interfaces/ReadableCellCreatedRejectedMessageFactoryInterface');
import ReadableAdditiveSharingMessageFactoryInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageFactoryInterface');
import ReadableAdditiveSharingMessageInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageInterface');
import ReadableCreateCellAdditiveMessageFactoryInterface = require('./messages/interfaces/ReadableCreateCellAdditiveMessageFactoryInterface');
import WritableCreateCellAdditiveMessageFactoryInterface = require('./messages/interfaces/WritableCreateCellAdditiveMessageFactoryInterface');
import WritableAdditiveSharingMessageFactoryInterface = require('./messages/interfaces/WritableAdditiveSharingMessageFactoryInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');
import WritableHydraMessageFactoryInterface = require('./messages/interfaces/WritableHydraMessageFactoryInterface');

class HydraMessageCenter extends events.EventEmitter implements HydraMessageCenterInterface {

	_connectionManager:ConnectionManagerInterface = null;

	_readableCellCreatedRejectedFactory:ReadableCellCreatedRejectedMessageFactoryInterface = null;
	_readableAdditiveSharingFactory:ReadableAdditiveSharingMessageFactoryInterface = null;
	_readableCreateCellAdditiveFactory:ReadableCreateCellAdditiveMessageFactoryInterface = null;
	_writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface = null;
	_writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface = null;
	_writableHydraMessageFactory:WritableHydraMessageFactoryInterface = null;

	public constructor (connectionManager:ConnectionManagerInterface, readableCellCreatedRejectedFactory:ReadableCellCreatedRejectedMessageFactoryInterface, readableAdditiveSharingFactory:ReadableAdditiveSharingMessageFactoryInterface, readableCreateCellAdditiveFactory:ReadableCreateCellAdditiveMessageFactoryInterface, writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface, writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface, writableHydraMessageFactory:WritableHydraMessageFactoryInterface) {
		super();

		this._connectionManager = connectionManager;
		this._readableCellCreatedRejectedFactory = readableCellCreatedRejectedFactory;
		this._readableAdditiveSharingFactory = readableAdditiveSharingFactory;
		this._readableCreateCellAdditiveFactory = readableCreateCellAdditiveFactory;
		this._writableCreateCellAdditiveFactory = writableCreateCellAdditiveFactory;
		this._writableAdditiveSharingFactory = writableAdditiveSharingFactory;
		this._writableHydraMessageFactory = writableHydraMessageFactory;

		this._setupListeners();
	}

	public sendAdditiveSharingMessage (to:HydraNode, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):void {
		var msg:Buffer = this._getAdditiveSharingMessagePayload(targetIp, targetPort, uuid, additivePayload);

		if (msg) {
			this._connectionManager.pipeMessageTo(to, 'ADDITIVE_SHARING', msg);
		}
	}

	public sendCreateCellAdditiveMessageAsInitiator (to:HydraNode, circuitId:string, uuid:string, additivePayload:Buffer):void {
		var msg:Buffer = null;

		try {
			msg = this._writableCreateCellAdditiveFactory.constructMessage(true, uuid, additivePayload, circuitId);
		}
		catch (e) {
		}

		if (msg) {
			this._connectionManager.pipeCircuitMessageTo(to, 'CREATE_CELL_ADDITIVE', msg, true);
		}
	}

	public spitoutRelayCreateCellMessage (encDecHandler:LayeredEncDecHandlerInterface, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer, circuitId:string):void {
		var payload:Buffer = this._getAdditiveSharingMessagePayload(targetIp, targetPort, uuid, additivePayload);

		if (payload) {
			var msg = this._writableHydraMessageFactory.constructMessage('ADDITIVE_SHARING', payload, payload.length);

			encDecHandler.encrypt(msg, null, (err:Error, encMessage:Buffer) => {
				var nodes:HydraNodeList = encDecHandler.getNodes();

				if (!err && encMessage) {
					this._connectionManager.pipeCircuitMessageTo(nodes[0], 'ENCRYPTED_SPITOUT', encMessage);
				}
			});
		}
	}

	private _getAdditiveSharingMessagePayload (targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):Buffer {
		var msg:Buffer = null;

		try {
			var createCellBuf:Buffer = this._writableCreateCellAdditiveFactory.constructMessage(false, uuid, additivePayload);
			msg = this._writableAdditiveSharingFactory.constructMessage(targetIp, targetPort, createCellBuf, createCellBuf.length);
		}
		catch (e) {
		}

		return msg;
	}

	private _emitMessage (message:ReadableHydraMessageInterface, node:HydraNode, msgFactory?:any, eventAppendix?:string) {
		var msg:any = null;

		if (msgFactory) {
			try {
				msg = msgFactory.create(message.getPayload());
			}
			catch (e) {
			}
		}
		else {
			msg = message;
		}

		if (msg) {
			this.emit(message.getMessageType() + (eventAppendix ? '_' + eventAppendix : ''), node, msg);
		}
	}

	private _onCircuitMessage (message:ReadableHydraMessageInterface, circuitNode:HydraNode):void {
		var circuitId:string = circuitNode.circuitId;

		if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
			this._emitMessage(message, circuitNode, this._readableCellCreatedRejectedFactory, circuitId);
		}
		else if (message.getMessageType() === 'ENCRYPTED_SPITOUT' || message.getMessageType() === 'ENCRYPTED_DIGEST') {
			this._emitMessage(message, circuitNode, null, circuitId);
		}
	}

	private _onMessage (identifier:string, message:ReadableHydraMessageInterface):void {
		if (message.getMessageType() === 'ADDITIVE_SHARING') {
			var msg:ReadableAdditiveSharingMessageInterface = null;

			try {
				msg = this._readableAdditiveSharingFactory.create(message.getPayload());
			}
			catch (e) {
			}

			if (msg) {
				this._connectionManager.pipeMessageTo({ ip: msg.getIp(), port: msg.getPort() }, 'CREATE_CELL_ADDITIVE', msg.getPayload());
			}
		}
		else if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {

			// IF INITIATOR, KEEP THE SOCKET OPEN!
			this._emitMessage(message, identifier, this._readableCreateCellAdditiveFactory);
		}
	}

	private _setupListeners ():void {
		this._connectionManager.on('circuitMessage', (msg:ReadableHydraMessageInterface, circuitNode:HydraNode) => {
			this._onCircuitMessage(msg, circuitNode);
		});

		this._connectionManager.on('message', (msg:ReadableHydraMessageInterface, identifier:string) => {
			this._onMessage(identifier, msg);
		});
	}

}

export = HydraMessageCenter;

