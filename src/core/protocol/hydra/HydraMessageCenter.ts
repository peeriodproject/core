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
	 * @member {core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableAdditiveSharingFactory
	 */
	_writableAdditiveSharingFactory:WritableAdditiveSharingMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableCreateCellAdditiveMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_WritableCreateCellAdditiveFactory
	 */
	_writableCreateCellAdditiveFactory:WritableCreateCellAdditiveMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.HydraMessageCenterInterface~_writableHydraMessageFactory
	 */
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

	/**
	 * Lets a provided factory read the payload of the message and emits this message.
	 * The name of the event is the human readably message type, appended with an eventAppend (e.g. a circuit id), if provided.
	 *
	 * @method core.protocol.hydra.HydraMessageCenter~_emitMessage
	 *
	 * @param {core.protocol.hydra.ReadableHydraMessageInterface} message The message to 'unwrap' and emit.
	 * @param {core.protocol.hydra.HydraNode} node The originating node of the message.
	 * @param {any} msgFactory Optional. Expects any readable message factory. If this is provided, the payload of the message is unwrapped by the message factory.
	 * @param {string} eventAppendix Optional. A string which gets appended to the event name, if present.
	 */
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
	 */
	private _onCircuitMessage (message:ReadableHydraMessageInterface, circuitNode:HydraNode):void {
		var circuitId:string = circuitNode.circuitId;

		if (message.getMessageType() === 'CELL_CREATED_REJECTED') {
			this._emitMessage(message, circuitNode, this._readableCellCreatedRejectedFactory, circuitId);
		}
		else if (message.getMessageType() === 'ENCRYPTED_SPITOUT' || message.getMessageType() === 'ENCRYPTED_DIGEST') {
			this._emitMessage(message, circuitNode, null, circuitId);
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

			// IF INITIATOR, KEEP THE SOCKET OPEN!
			this._emitMessage(message, identifier, this._readableCreateCellAdditiveFactory);
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

