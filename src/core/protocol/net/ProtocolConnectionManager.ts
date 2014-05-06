import events = require('events');

import ObjectConfig = require('../../config/ObjectConfig');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ProtocolConnectionManagerInterface = require('./interfaces/ProtocolConnectionManagerInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import ReadableMessageFactory = require('./../messages/ReadableMessageFactory');
import TCPSocketHandlerInterface = require('../../net/tcp/interfaces/TCPSocketHandlerInterface');
import TCPSocketInterface = require('../../net/tcp/interfaces/TCPSocketInterface');
import MessageByteCheatsheet = require('./../messages/MessageByteCheatsheet');
import IncomingDataPipelineInterface = require('./../messages/interfaces/IncomingDataPipelineInterface');
import IncomingDataPipeline = require('./../messages/IncomingDataPipeline');
import IncomingPendingSocket = require('./interfaces/IncomingPendingSocket');
import IncomingPendingSocketList = require('./interfaces/IncomingPendingSocketList');
import OutgoingPendingSocket = require('./interfaces/OutgoingPendingSocket');
import OutgoingPendingSocketList = require('./interfaces/OutgoingPendingSocketList');
import ConfirmedSocket = require('./interfaces/ConfirmedSocket');
import ConfirmedSocketList = require('./interfaces/ConfirmedSocketList');


/**
 * @class core.protocol.ProtocolConnectionManager
 *
 * @extends events.EventEmitter
 * @implements core.protocol.ProtocolConnectionManagerInterface
 *
 */
class ProtocolConnectionManager extends events.EventEmitter implements ProtocolConnectionManagerInterface {

	private _temporaryIdentifierPrefix = '_temp';
	private _temporaryIdentifierCount:number = 0;

	private _tcpSocketHandler:TCPSocketHandlerInterface = null;

	private _confirmedSockets:ConfirmedSocketList = {};
	private _outgoingPendingSockets:OutgoingPendingSocketList = {};
	private _incomingPendingSockets:IncomingPendingSocketList = {};

	private _incomingDataPipeline:IncomingDataPipelineInterface = null;

	private _incomingPendingTimeoutLength:number = 0;

	constructor (config:ObjectConfig, tcpSocketHandler:TCPSocketHandlerInterface) {
		super();

		this._tcpSocketHandler = tcpSocketHandler;

		this._incomingDataPipeline = new IncomingDataPipeline(
			config.get('protocol.messages.maxByteLengthPerMessage'),
			MessageByteCheatsheet.messageEnd,
			config.get('prococol.messages.msToKeepNonAddressableMemory'),
			new ReadableMessageFactory()
		);

		this._incomingPendingTimeoutLength = config.get('protocol.net.msToWaitForIncomingMessage');

		this._setGlobalListeners();
	}

	private _setGlobalListeners ():void {
		this._incomingDataPipeline.on('message', (identifier:string, message:ReadableMessageInterface) => {
			this._onMessage(identifier, message);
		});

		this._tcpSocketHandler.on('connected', (socket:TCPSocketInterface, direction:string) => {
			if (direction === 'incoming') {
				this._onIncomingConnection(socket);
			}
		});
	}

	private _onMessage (identifier:string, message:ReadableMessageInterface):void {
		var propagateMessage:boolean = true;
		var incomingPending:IncomingPendingSocket = this._incomingPendingSockets[identifier];

		if (incomingPending) {
			var newIdentifier:string = this._nodeToIdentifier(message.getSender());
			this._fromIncomingPendingToConfirmed(newIdentifier, identifier, incomingPending);
		}
		else if (!(this._identifierAndContactNodeMatch(identifier, message.getSender()))) {
			// does not seem to be the person it's supposed to be. we assume something is wrong here
			// and destroy the connection.
			propagateMessage = false;
			this._destroyConnectionByIdentifier(identifier);
		}

		if (propagateMessage) {
			this.emit('message', message);
		}
	}

	private _fromIncomingPendingToConfirmed(newIdentifier:string, oldIdentifier:string, pending:IncomingPendingSocket):void {
		var socket:TCPSocketInterface = pending.socket;
		var outgoingPending:OutgoingPendingSocket = this._outgoingPendingSockets[newIdentifier];

		if (pending.timeout) {
			clearTimeout(pending.timeout);
		}
		delete this._incomingPendingSockets[oldIdentifier];

		// check if any outgoing are pending
		if (outgoingPending) {
			outgoingPending.closeAtOnce = true;
		}

		socket.setIdentifier(newIdentifier);

		this._addToConfirmed(newIdentifier, 'incoming', socket);
	}

	private _addToConfirmed(identifier:string, direction:string, socket:TCPSocketInterface) {
		var existingSocket = this._confirmedSockets[identifier];
		var newConfirmedSocket:ConfirmedSocket = {
			socket: socket,
			direction: direction
		};

		if (existingSocket) {
			if (direction === 'outgoing' && existingSocket.direction === 'incoming') {
				this._destroyConnection(socket, true);
				return;
			}
			else {
				this._destroyConnection(existingSocket.socket, true);
			}
		}
		this._confirmedSockets[identifier] = newConfirmedSocket;
	}

	private _identifierAndContactNodeMatch(identifier: string, node:ContactNodeInterface):boolean {
		return identifier === this._nodeToIdentifier(node);
	}

	private _nodeToIdentifier(node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

	private _onIncomingConnection(socket:TCPSocketInterface):void {
		var identifier:string = this._setTemporaryIdentifier(socket);
		if (!this._incomingPendingSockets[identifier]) {
			var pending:IncomingPendingSocket = {
				socket: socket,
				timeout: setTimeout(() => { this._destroyConnection(socket) }, this._incomingPendingTimeoutLength)
			};
			this._incomingPendingSockets[identifier] = pending;
			this._incomingDataPipeline.hookSocket(socket);
		}
	}

	private _destroyConnection(socket:TCPSocketInterface, blockTerminationEvent?:boolean):void {
		var identifier = socket.getIdentifier();
		var incoming:IncomingPendingSocket = this._incomingPendingSockets[identifier];
		var outgoing:OutgoingPendingSocket = this._outgoingPendingSockets[identifier];
		var confirmed:ConfirmedSocket = this._confirmedSockets[identifier];

		this._incomingDataPipeline.unhookSocket(socket);

		if (incoming) {
			if (incoming.timeout) {
				clearTimeout(incoming.timeout);
			}
			delete this._incomingPendingSockets[identifier];
		}
		if (outgoing) {
			delete this._outgoingPendingSockets[identifier];
		}
		if (confirmed) {
			delete this._confirmedSockets[identifier];
		}

		socket.forceDestroy();

		if (!blockTerminationEvent) {
			this._emitTerminatedEventByIdentifier(identifier);
		}
	}

	private _emitTerminatedEventByIdentifier(identifier:string) {
		try {
			var id = new Id(Id.byteBufferByHexString(identifier, 20), 160);
			this.emit('terminatedConnection', id);
		}
		catch (e) {}
	}

	private _destroyConnectionByIdentifier(identifier:string):void {
		var socket = null;
		var it = ['_incomingPendingSockets', '_outgoingPendingSockets', '_confirmedSockets'];
		for (var i=0; i<3; i++) {
			if (socket) {
				break;
			}
			else {
				var o = this[it[i]][identifier];
				if (o) {
					socket = o.socket || null;
				}
			}
		}
		if (socket) {
			this._destroyConnection(socket);
		}
	}

	private _setTemporaryIdentifier(socket:TCPSocketInterface):string {
		var identifier:string = this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount);
		socket.setIdentifier(identifier);

		return identifier;
	}

}

export = ProtocolConnectionManager;