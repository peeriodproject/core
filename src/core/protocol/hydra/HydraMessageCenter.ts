import events = require('events');

import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');

// messages
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');
import ReadableCellCreatedRejectedMessageFactoryInterface = require('./messages/interfaces/ReadableCellCreatedRejectedMessageFactoryInterface');
import ReadableCreateCellAdditiveMessageInterface = require('./messages/interfaces/ReadableCreateCellAdditiveMessageInterface');
import ReadableAdditiveSharingMessageFactoryInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageFactoryInterface');
import ReadableAdditiveSharingMessageInterface = require('./messages/interfaces/ReadableAdditiveSharingMessageInterface');
import ReadableCreateCellAdditiveMessageFactoryInterface = require('./messages/interfaces/ReadableCreateCellAdditiveMessageFactoryInterface');
import WritableCreateCellAdditiveMessageFactoryInterface = require('./messages/interfaces/WritableCreateCellAdditiveMessageFactoryInterface');
import WritableAdditiveSharingMessageFactoryInterface = require('./messages/interfaces/WritableAdditiveSharingMessageFactoryInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');
import WritableHydraMessageFactoryInterface = require('./messages/interfaces/WritableHydraMessageFactoryInterface');
import ReadableHydraMessageFactoryInterface = require('./messages/interfaces/ReadableHydraMessageFactoryInterface');
import WritableCellCreatedRejectedMessageFactoryInterface = require('./messages/interfaces/WritableCellCreatedRejectedMessageFactoryInterface');

/**
 * HydraMessageCenterInterface implementation
 *
 * Takes a lot of message factories.
 *
 * @class core.protocol.hydra.HydraMessageCenter
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.hydra.HydraMessageCenterInterface
 *
 * @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager A working connection manager instance.
 * @param {core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface} readableCellCreatedRejectedFactory
 * @param {core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface} readableAdditiveSharingFactory
 * @param {core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface} readableCreateCellAdditiveFactory
 * @param {core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface} writableCreateCellAdditiveFactory
 * @param {core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface} writableAdditiveSharingFactory
 * @param {core.protocol.hydra.WritableHydraMessageFactoryInterface} writableHydraMessageFactory
 */
class HydraMessageCenter extends events.EventEmitter implements HydraMessageCenterInterface {

	/**
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraMessageCenterInterface~_connectionManager
	 */
	_connectionManager:ConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableAdditiveSharingFactory
	 */
	_readableAdditiveSharingFactory:ReadableAdditiveSharingMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableCellCreatedRejectedFactory
	 */
	_readableCellCreatedRejectedFactory:ReadableCellCreatedRejectedMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableCreateCellAdditiveFactory
	 */
	_readableCreateCellAdditiveFactory:ReadableCreateCellAdditiveMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.ReadableHydraMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_readableHydraMessageFactory
	 */
	_readableHydraMessageFactory:ReadableHydraMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableAdditiveSharingFactory
	 */
	_writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_WritableCreateCellAdditiveFactory
	 */
	_writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableCellCreatedRejectedMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableCellCreatedRejectedFactory
	 */
	_writableCellCreatedRejectedFactory:WritableCellCreatedRejectedMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableHydraMessageFactory
	 */
	_writableHydraMessageFactory:WritableHydraMessageFactoryInterface = null;

	public constructor (connectionManager:ConnectionManagerInterface, readableHydraMessageFactory: ReadableHydraMessageFactoryInterface, readableCellCreatedRejectedFactory:ReadableCellCreatedRejectedMessageFactoryInterface, readableAdditiveSharingFactory:ReadableAdditiveSharingMessageFactoryInterface, readableCreateCellAdditiveFactory:ReadableCreateCellAdditiveMessageFactoryInterface, writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface, writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface, writableHydraMessageFactory:WritableHydraMessageFactoryInterface, writableCellCreatedRejectedFactory:WritableCellCreatedRejectedMessageFactoryInterface) {
		super();

		this._connectionManager = connectionManager;
		this._readableHydraMessageFactory = readableHydraMessageFactory;
		this._readableCellCreatedRejectedFactory = readableCellCreatedRejectedFactory;
		this._readableAdditiveSharingFactory = readableAdditiveSharingFactory;
		this._readableCreateCellAdditiveFactory = readableCreateCellAdditiveFactory;
		this._writableCreateCellAdditiveFactory = writableCreateCellAdditiveFactory;
		this._writableAdditiveSharingFactory = writableAdditiveSharingFactory;
		this._writableHydraMessageFactory = writableHydraMessageFactory;
		this._writableCellCreatedRejectedFactory = writableCellCreatedRejectedFactory;

		this._setupListeners();
	}

	public forceCircuitMessageThrough (payload:Buffer, from:HydraNode):void {
		var msg:ReadableHydraMessageInterface = null;

		try {
			msg = this._readableHydraMessageFactory.create(payload, true);
		}
		catch (e) {
		}

		if (msg) {
			this._onCircuitMessage(msg, from, true);
		}
	}

	public getFullBufferOfMessage (type:string, msg:any):Buffer {
		var buffer:Buffer = null;
		var middleMessage:Buffer = null;

		try {
			if (type === 'CELL_CREATED_REJECTED') {
				middleMessage = this._writableCellCreatedRejectedFactory.constructMessage(msg.getUUID(), msg.getSecretHash(), msg.getDHPayload());
			}

			buffer = this._writableHydraMessageFactory.constructMessage(type, middleMessage);
		} catch (e) {}

		return buffer;
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

	public sendCellCreatedRejectedMessage (to:HydraNode, uuid:string, secretHash?:Buffer, dhPayload?:Buffer):void {
		var msg:Buffer = null;

		try {
			msg = this._writableCellCreatedRejectedFactory.constructMessage(uuid, secretHash, dhPayload);
		}
		catch (e) {
		}

		if (msg) {
			this._connectionManager.pipeCircuitMessageTo(to, 'CELL_CREATED_REJECTED', msg);
		}
	}

	public spitoutFileTransferMessage (encDecHandler:LayeredEncDecHandlerInterface, payload:Buffer, earlyExit?:HydraNode):void {
		var msg = this._writableHydraMessageFactory.constructMessage('FILE_TRANSFER', payload, payload.length);

		encDecHandler.encrypt(msg, earlyExit, (err:Error, encMessage:Buffer) => {
			var nodes:HydraNodeList = encDecHandler.getNodes();

			if (!err && encMessage) {
				this._connectionManager.pipeCircuitMessageTo(nodes[0], 'ENCRYPTED_SPITOUT', encMessage);
			}
		});
	}

	public spitoutRelayCreateCellMessage (encDecHandler:LayeredEncDecHandlerInterface, targetIp:string, targetPort:number, uuid:string, additivePayload:Buffer):void {
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

	public unwrapAdditiveSharingPayload (message:ReadableAdditiveSharingMessageInterface):ReadableCreateCellAdditiveMessageInterface {
		var msg:ReadableCreateCellAdditiveMessageInterface = null;

		try {
			msg = this._readableCreateCellAdditiveFactory.create(message.getPayload());
		}
		catch (e) {

		}

		return msg;
	}

	public wrapFileTransferMessage (payload:Buffer):Buffer {
		return this._writableHydraMessageFactory.constructMessage('FILE_TRANSFER', payload);
	}

	/**
	 * Lets a provided factory read the payload of the message and emits this message.
	 * The name of the event is the human readably message type, appended with an eventAppend (e.g. a circuit id), if provided.
	 *
	 * @method core.protocol.hydra.HydraMessageCenter~_emitMessage
	 *
	 * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to 'unwrap' and emit.
	 * @param {any} nodeOrIdentifier The originating hydra node or the socket identifier the message came through.
	 * @param {any} msgFactory Optional. Expects any readable message factory. If this is provided, the payload of the message is unwrapped by the message factory.
	 * @param {string} eventAppendix Optional. A string which gets appended to the event name, if present.
	 * @param {boolean} decrypted Optional. Indicates whether this message is the decryption of an encrypted message.
	 */
	private _emitMessage (message:ReadableHydraMessageInterface, nodeOrIdentifier:any, msgFactory?:any, eventAppendix?:string, decrypted?:boolean) {
		var msg:any = null;

		if (msgFactory) {
			try {
				msg = msgFactory.create(message.getPayload());
			}
			catch (e) {
				throw e;
			}
		}
		else {
			msg = message;
		}

		if (msg) {
			this.emit(message.getMessageType() + (eventAppendix ? '_' + eventAppendix : ''), nodeOrIdentifier, msg, decrypted);
		}
	}

	/**
	 * Creates a CREATE_CELL_ADDITIVE message and wraps it in an ADDITIVE_SHARING message and returns the payload.
	 *
	 * @method core.protocol.hydra.HydraConnectionManager~_getAdditiveSharingMessagePayload
	 *
	 * @param {string} targetIp The IP address the receiver node should relay the payload to.
	 * @param {number} targetPort The port the receiver node should relay the payload to.
	 * @param {string} uuid The UUID of the additive sharing scheme.
	 * @param {Buffer} additivePayload The additive payload.
	 * @returns {Buffer} The CREATE_CELL_ADDITIVE payload
	 */
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

	/**
	 * Handler for 'circuit' messages, i.e. message which originated from a socket which is assigned to a specific circuit node.
	 *
	 * @method core.protocol.hydra.HydraMessageCenter~_onCircuitMessage
	 *
	 * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to handle.
	 * @param {core.protocol.hydra.HydraNode} circuitNode The node this message originates from.
	 * @param {boolean} decrypted Optional. Indicates whether this message is the decryption of an encrypted message.
	 */
	private _onCircuitMessage (message:ReadableHydraMessageInterface, circuitNode:HydraNode, decrypted?:boolean):void {
		var circuitId:string = circuitNode.circuitId;

		if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
			this._emitMessage(message, circuitNode, this._readableCellCreatedRejectedFactory, circuitId, decrypted);
		}
		else if (message.getMessageType() === 'ADDITIVE_SHARING') {
			this._emitMessage(message, circuitNode, this._readableAdditiveSharingFactory, circuitId, decrypted);
		}
		else if (message.getMessageType() === 'FILE_TRANSFER') {
			this._emitMessage(message, circuitNode, null, circuitId, decrypted);
		}
		else if (message.getMessageType() === 'ENCRYPTED_SPITOUT' || message.getMessageType() === 'ENCRYPTED_DIGEST') {
			this._emitMessage(message, circuitNode, null, circuitId, decrypted);
		}
	}

	/**
	 * Handler for 'regular' hydra messages, i.e. messages from sockets which are not assigned to a specific circuit node.
	 *
	 * @method core.protocol.hydra.HydraMessageCenter~_onMessage
	 *
	 * @param {string} identifier The identifier of the socket this message came through. (can the be used for future work)
	 * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to handle.
	 */
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
			this._emitMessage(message, identifier, this._readableCreateCellAdditiveFactory);
		}
		else if (message.getMessageType() === 'FILE_TRANSFER') {
			this.emit('regularFileTransferMsg', identifier, message.getPayload());
		}
	}

	/**
	 * Sets uo the listeners on the connection manager.
	 *
	 * @method core.protocol.hydra.HydraMessageCenter~_setupListeners
	 */
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

