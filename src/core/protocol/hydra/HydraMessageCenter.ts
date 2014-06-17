import events = require('events');

import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');

// messages
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');
import ReadableCellCreatedRejectedMessageFactoryInterface = require('./messages/interfaces/ReadableCellCreatedRejectedMessageFactoryInterface');
import ReadableAdditiveSharingMessageFactoryInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageFactoryInterface');
import ReadableAdditiveSharingMessageInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageInterface');
import ReadableCreateCellAdditiveMessageFactoryInterface = require('./messages/interfaces/ReadableCreateCellAdditiveMessageFactoryInterface');
import WritableCreateCellAdditiveMessageFactoryInterface = require('./messages/interfaces/WritableCreateCellAdditiveMessageFactoryInterface');
import WritableAdditiveSharingMessageFactoryInterface = require('./messages/interfaces/WritableAdditiveSharingMessageFactoryInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');

class HydraMessageCenter extends events.EventEmitter implements HydraMessageCenterInterface {

	_connectionManager:HydraConnectionManagerInterface = null;

	_readableCellCreatedRejectedFactory:ReadableCellCreatedRejectedMessageFactoryInterface = null;
	_readableAdditiveSharingFactory:ReadableAdditiveSharingMessageFactoryInterface = null;
	_readableCreateCellAdditiveFactory:ReadableCreateCellAdditiveMessageFactoryInterface = null;
	_writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface = null;
	_writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface = null;

	public constructor (connectionManager:HydraConnectionManagerInterface, readableCellCreatedRejectedFactory:ReadableCellCreatedRejectedMessageFactoryInterface, readableAdditiveSharingFactory:ReadableAdditiveSharingMessageFactoryInterface, readableCreateCellAdditiveFactory:ReadableCreateCellAdditiveMessageFactoryInterface, writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface, writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface) {
		super();

		this._connectionManager = connectionManager;
		this._readableCellCreatedRejectedFactory = readableCellCreatedRejectedFactory;
		this._readableAdditiveSharingFactory = readableAdditiveSharingFactory;
		this._readableCreateCellAdditiveFactory = readableCreateCellAdditiveFactory;
		this._writableCreateCellAdditiveFactory = writableCreateCellAdditiveFactory;
		this._writableAdditiveSharingFactory = writableAdditiveSharingFactory;

		this._setupListeners();
	}

	public sendAdditiveSharingMessage (to:HydraNode, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):void {
		var msg:Buffer = this._getAdditiveSharingMessagePayload(targetIp, targetPort, uuid, additivePayload);

		if (msg) {
			this._connectionManager.pipeMessage('ADDITIVE_SHARING', msg, to);
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
			this._connectionManager.pipeMessage('CREATE_CELL_ADDITIVE', msg, to);
		}
	}

	public spitoutRelayCreateCellMessage (encDecHandler:LayeredEncDecHandlerInterface, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer, circuitId:string):void {
		var msg:Buffer = this._getAdditiveSharingMessagePayload(targetIp, targetPort, uuid, additivePayload);

		if (msg) {
			encDecHandler.encrypt(msg, null, (err:Error, encMessage:Buffer) => {
				var nodes:HydraNodeList = encDecHandler.getNodes();

				if (!err && encMessage) {
					this._connectionManager.pipeMessage('ENCRYPTED_SPITOUT', encMessage, nodes[nodes.length - 1], circuitId);
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

	private _emitMessage (message:ReadableHydraMessageInterface, ip:string, msgFactory:any, eventAppendix?:string) {
		var msg:any = null;

		try {
			msg = msgFactory.create(message.getPayload());
		}
		catch (e) {
		}

		if (msg) {
			this.emit(message.getMessageType() + (eventAppendix ? '_' + eventAppendix : ''), ip, msg);
		}
	}

	private _onMessage (ip:string, message:ReadableHydraMessageInterface):void {
		var circuitId:string = message.getCircuitId();

		if (circuitId) {
			if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
				this._emitMessage(message, ip, this._readableCellCreatedRejectedFactory, circuitId);
			}
		}
		else {
			if (message.getMessageType() === 'ADDITIVE_SHARING') {
				var msg:ReadableAdditiveSharingMessageInterface = null;

				try {
					msg = this._readableAdditiveSharingFactory.create(message.getPayload());
				}
				catch (e) {
				}

				if (msg) {
					this._connectionManager.pipeMessage('CREATE_CELL_ADDITIVE', msg.getPayload(), { ip: msg.getIp(), port: msg.getPort() });
				}
			}
			else if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {

				this._emitMessage(message, ip, this._readableCreateCellAdditiveFactory);
			}
		}
	}

	private _setupListeners ():void {
		this._connectionManager.on('hydraMessage', (ip:string, msg:ReadableHydraMessageInterface) => {
			this._onMessage(ip, msg);
		});
	}

}

export = HydraMessageCenter;

