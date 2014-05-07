import events = require('events');

import ObjectConfig = require('../../config/ObjectConfig');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
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
import WaitForSocket = require('./interfaces/WaitForSocket');
import WaitForSocketList = require('./interfaces/WaitForSocketList');


/**
 * ProtocolConnectionManager implementation.
 * Detailed structuring is found in the interface comments.
 *
 * @class core.protocol.ProtocolConnectionManager
 * @extends events.EventEmitter
 * @implements core.protocol.ProtocolConnectionManagerInterface
 *
 * @param {core.config.ObjectConfig} config Default configuration
 * @param {core.net.tcp.TCPSocketHandlerInterface} Fully bootstrapped TCPSocket handler to use.
 */
class ProtocolConnectionManager extends events.EventEmitter implements ProtocolConnectionManagerInterface {

	/**
	 * List to keep track of confirmed sockets.
	 *
	 * @member {core.protocol.net.ConfirmedSocketList} core.protocol.net.ProtocolConnectionManager~_confirmedSockets
	 */
	private _confirmedSockets:ConfirmedSocketList = {};

	/**
	 * List to keep track of waiting connections. Stores callbacks, timeouts and an indexing number under
	 * one socket identifier.
	 *
	 * @member {core.protocol.net.WaitForSocketList} core.protocol.net.ProtocolConnectionManager~_connectionWaitingList
	 */
	private _connectionWaitingList:WaitForSocketList = {};

	/**
	 * The data pipeline sockets get hooked/unhooked to/from.
	 *
	 * @member {core.protocol.messages.IncomingDataPipelineInterface} core.protocol.net.ProtocolConnectionManager~_incomingDataPipeline
	 */
	private _incomingDataPipeline:IncomingDataPipelineInterface = null;

	/**
	 * Stores the incoming sockets which haven't been assigned a valid identifier. Store also a timeout which destroys
	 * the socket if it is elapsed and couldn't be assiged an ID.
	 *
	 * @member {core.protocol.net.IncomingPendingSocketList} core.protocol.net.ProtocolConnectionManager~_incomingPendingSocketList
	 */
	private _incomingPendingSockets:IncomingPendingSocketList = {};

	/**
	 * Number of milliseconds to wait for a valid message until a non-assignable socket gets destroyed.
	 *
	 * @member {number} core.protocol.net.ProtocolConnectionManager~_incomingPendingTimeoutLength
	 */
	private _incomingPendingTimeoutLength:number = 0;

	/**
	 * List of identifiers whose sockets will not be closed on being idle.
	 *
	 * @member {string} core.protocol.net.ProtocolConnectionManager~_keepSocketOpenList
	 */
	private _keepSocketOpenList:Array<string> = [];

	/**
	 * The number of milliseconds to wait for a socket connection to a node until it is marked as unsuccessful.
	 *
	 * @member {number} core.protocol.net.ProtocolConnectionManager~_msToWaitForConnection
	 */
	private _msToWaitForConnection:number = 0;

	/**
	 * List to kee track of outgoing connections. Holds the `closeAtOnce` flag (see interface description).
	 *
	 * @member {core.protoocol.netOutgoingPendingSocketList} core.protocol.net.ProtocolConnectionManager~_outgoingPendingSocketList
	 */
	private _outgoingPendingSockets:OutgoingPendingSocketList = {};

	/**
	 * The TCP socket handler which passes the sockets and does the networking stuff.
	 *
	 * @member {core.net.tcp.TCPSocketHandlerInterface} core.protocol.net.ProtocolConnectionManager~_tcpSocketHandler
	 */
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;

	/**
	 * Simple number which gets increased everytime to make temporary identifiers unique.
	 *
	 * @member {number} core.protocol.net.ProtocolConnectionManager~_temporaryIdentifierCount
	 */
	private _temporaryIdentifierCount:number = 0;

	/**
	 * Prefix for temporary identifiers on incoming sockets.
	 *
	 * @member {string} core.protocol.net.ProtocolConnectionManager~_temporaryIdentifierPrefix
	 */
	private _temporaryIdentifierPrefix = '_temp';

	/**
	 * Simple number which gets increased everytime to make waiting list indices unique.
	 *
	 * @member {number} core.protocol.net.ProtocolConnectionManager~_waitingListNum
	 */
	private _waitingListNum:number = 0;

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
		this._msToWaitForConnection = config.get('protocol.net.maxSecondsToWaitForConnection') * 1000;

		this._setGlobalListeners();
	}

	/**
	 * Testing purposes only. Should not be used in production.
	 *
	 * @method {core.protocol.net.ProtocolConnectionManager#getOutgoingPendingSocketList
	 *
	 * @returns {OutgoingPendingSocketList}
	 */
	public getOutgoingPendingSocketList ():OutgoingPendingSocketList {
		return this._outgoingPendingSockets;
	}

	/**
	 * Testing purposes only. Should not be used in production.
	 *
	 * @method {core.protocol.net.ProtocolConnectionManager#getIncomingPendingSocketList
	 *
	 * @returns {IncomingPendingSocketList}
	 */
	public getIncomingPendingSocketList ():IncomingPendingSocketList {
		return this._incomingPendingSockets;
	}

	/**
	 * Testing purposes only. Should not be used in production.
	 *
	 * @method {core.protocol.net.ProtocolConnectionManager#getConfirmedSocketList
	 *
	 * @returns {ConfirmedSocketList}
	 */
	public getConfirmedSocketList ():ConfirmedSocketList {
		return this._confirmedSockets;
	}

	/**
	 * Testing purposes only. Should not be used in production.
	 *
	 * @method {core.protocol.net.ProtocolConnectionManager#getWaitForSocketList
	 *
	 * @returns {WaitForSocketList}
	 */
	public getWaitForSocketList ():WaitForSocketList {
		return this._connectionWaitingList;
	}

	public getConfirmedSocketByContactNode (node:ContactNodeInterface):TCPSocketInterface {
		return this._getConfirmedSocketByIdentifier(this._nodeToIdentifier(node));
	}

	public getConfirmedSocketById (id:IdInterface):TCPSocketInterface {
		return this._getConfirmedSocketByIdentifier(id.toHexString());
	}

	public keepSocketsNoLongerOpenFromNode (contactNode:ContactNodeInterface):void {
		var identifier:string = this._nodeToIdentifier(contactNode);
		var i:number = this._keepSocketOpenList.indexOf(identifier);

		if (i > -1) {
			var existing:ConfirmedSocket = this._confirmedSockets[identifier];
			if (existing) {
				existing.socket.setCloseOnTimeout(true);
			}
			this._keepSocketOpenList.splice(i, 1);
		}
	}

	public keepSocketsOpenFromNode (contactNode:ContactNodeInterface):void {
		var identifier:string = this._nodeToIdentifier(contactNode);

		if (this._keepSocketOpenList.indexOf(identifier) > -1) {
			return;
		}
		else {
			this._keepSocketOpenList.push(identifier);
			var existing:ConfirmedSocket = this._confirmedSockets[identifier];
			if (existing) {
				existing.socket.setCloseOnTimeout(false);
			}
		}
	}

	public obtainConnectionTo (node:ContactNodeInterface, callback:(err:Error, socket:TCPSocketInterface) => any):void {
		var identifier = this._nodeToIdentifier(node);
		var existing = this._getConfirmedSocketByIdentifier(identifier);

		if (existing) {
			callback(null, existing);
		}
		else {
			this._addToWaitingList(identifier, callback);
			this._initiateOutgoingConnection(node);
		}
	}

	public writeBufferTo (node:ContactNodeInterface, buffer:Buffer, callback?:(err:Error) => any):void {
		this.obtainConnectionTo(node, function (err:Error, socket:TCPSocketInterface) {
			if (err) {
				if (callback) {
					callback(err);
				}
			}
			else {
				socket.writeBuffer(buffer, function () {
					if (callback) {
						callback(null);
					}
				});
			}
		});
	}

	private _addToConfirmed (identifier:string, direction:string, socket:TCPSocketInterface) {
		var existingSocket = this._confirmedSockets[identifier];
		var newConfirmedSocket:ConfirmedSocket = {
			socket   : socket,
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

		this._hookDestroyOnCloseToSocket(socket);

		if (this._keepSocketOpenList.indexOf(identifier) > -1) {
			socket.setCloseOnTimeout(false);
		}

		this._confirmedSockets[identifier] = newConfirmedSocket;

		this.emit('confirmedSocket', identifier, socket);
	}

	private _addToWaitingList (identifier:string, callback:(err:Error, socket:TCPSocketInterface) => any):void {
		var existing = this._connectionWaitingList[identifier];
		var index = ++this._waitingListNum;

		var waitFor:WaitForSocket = {
			index   : index,
			callback: callback,
			timeout : this._getConnectionWaitingListTimeout(identifier, index)
		};

		if (!existing) {
			this._connectionWaitingList[identifier] = [];
		}

		this._connectionWaitingList[identifier].push(waitFor);
	}

	private _callbackWaitingConnection (identifier:string, index:number, err:Error, sock:TCPSocketInterface):WaitForSocket {
		var list:Array<WaitForSocket> = this._connectionWaitingList[identifier];
		var item:WaitForSocket = null;
		var _i:number = 0;
		var retVal:WaitForSocket = null;

		for (var i = 0; i < list.length; i++) {
			if (list[i].index === index) {
				item = list[i];
				_i = i;
				break;
			}
		}

		if (item) {
			item.callback(err, sock);
			retVal = this._connectionWaitingList[identifier].splice(_i, 1)[0];
			if (this._connectionWaitingList[identifier].length === 0) {
				delete this._connectionWaitingList[identifier];
			}
		}

		return retVal;
	}

	private _destroyConnection (socket:TCPSocketInterface, blockTerminationEvent?:boolean):void {
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

		if (confirmed && !blockTerminationEvent) {
			this._emitTerminatedEventByIdentifier(identifier);
		}
	}

	private _destroyConnectionByIdentifier (identifier:string):void {
		var socket = null;
		var it = ['_incomingPendingSockets', '_confirmedSockets'];
		for (var i = 0; i < 3; i++) {
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

	private _emitTerminatedEventByIdentifier (identifier:string) {
		try {
			var id = new Id(Id.byteBufferByHexString(identifier, 20), 160);
			this.emit('terminatedConnection', id);
		}
		catch (e) {
		}
	}

	private _fromIncomingPendingToConfirmed (newIdentifier:string, oldIdentifier:string, pending:IncomingPendingSocket):void {
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

	private _getConfirmedSocketByIdentifier (identifier:string):TCPSocketInterface {
		var existing = this._confirmedSockets[identifier];
		if (existing) {
			return existing.socket;
		}
		return null;
	}

	private _getConnectionWaitingListTimeout (identifier:string, index:number):number {

		return setTimeout(() => {
			this._callbackWaitingConnection(identifier, index, new Error('ProtocolConnectionManager: Unable to obtain connection to ' + identifier), null);
		}, this._msToWaitForConnection);
	}

	private _hookDestroyOnCloseToSocket (socket:TCPSocketInterface) {
		// remote close
		socket.on('close', () => {
			this._destroyConnection(socket);
		});
	}

	private _identifierAndContactNodeMatch (identifier:string, node:ContactNodeInterface):boolean {
		return identifier === this._nodeToIdentifier(node);
	}

	private _initiateOutgoingConnection (contactNode:ContactNodeInterface):void {
		var identifier:string = this._nodeToIdentifier(contactNode);

		if (!this._outgoingPendingSockets[identifier]) {
			var outgoingEntry:OutgoingPendingSocket = {
				closeAtOnce: false
			};

			this._outgoingPendingSockets[identifier] = outgoingEntry;

			this._tryToOutgoingConnectToNode(contactNode, (socket:TCPSocketInterface) => {
				if (socket) {
					if (outgoingEntry.closeAtOnce) {
						socket.forceDestroy();
					}
					else {
						socket.setIdentifier(identifier);
						this._incomingDataPipeline.hookSocket(socket);
						this._addToConfirmed(identifier, 'outgoing', socket);
					}
				}
				delete this._outgoingPendingSockets[identifier];
			});
		}
	}

	private _nodeToIdentifier (node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

	private _onConfirmedSocket (identifier:string, socket:TCPSocketInterface):void {
		var waiting:Array<WaitForSocket> = this._connectionWaitingList[identifier];
		if (waiting) {
			for (var i = 0; i < waiting.length; i++) {
				var item:WaitForSocket = waiting[i];
				clearTimeout(item.timeout);
				item.callback(null, socket);
			}

			delete this._connectionWaitingList[identifier];
		}
	}

	private _onIncomingConnection (socket:TCPSocketInterface):void {
		var identifier:string = this._setTemporaryIdentifier(socket);
		if (!this._incomingPendingSockets[identifier]) {
			var pending:IncomingPendingSocket = {
				socket : socket,
				timeout: setTimeout(() => {
					this._destroyConnection(socket)
				}, this._incomingPendingTimeoutLength)
			};
			this._incomingPendingSockets[identifier] = pending;
			this._incomingDataPipeline.hookSocket(socket);
		}
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

	private _setGlobalListeners ():void {
		this._incomingDataPipeline.on('message', (identifier:string, message:ReadableMessageInterface) => {
			this._onMessage(identifier, message);
		});

		this._tcpSocketHandler.on('connected', (socket:TCPSocketInterface, direction:string) => {
			if (direction === 'incoming') {
				this._onIncomingConnection(socket);
			}
		});

		this.on('confirmedSocket', this._onConfirmedSocket);
	}

	private _setTemporaryIdentifier (socket:TCPSocketInterface):string {
		var identifier:string = this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount);
		socket.setIdentifier(identifier);

		return identifier;
	}

	private _tryToOutgoingConnectToNode (contactNode, callback:(socket:TCPSocketInterface) => any) {
		var addresses:ContactNodeAddressListInterface = contactNode.getAddresses();
		var startAt:number = 0;
		var maxIndex:number = addresses.length - 1;
		var tcpSocketHandler:TCPSocketHandlerInterface = this._tcpSocketHandler;

		var connectToAddressByIndex = function (i:number, callback:(socket:TCPSocketInterface) => any) {
			var address:ContactNodeAddressInterface = address[i];
			tcpSocketHandler.connectTo(address.getPort(), address.getIp(), callback);
		};
		var theCallback = function (socket:TCPSocketInterface) {
			if (!socket) {
				if (++startAt <= maxIndex) {
					connectToAddressByIndex(startAt, theCallback);
				}
			}
			else {
				callback(socket);
			}
		};

		connectToAddressByIndex(startAt, theCallback);
	}

}

export = ProtocolConnectionManager;