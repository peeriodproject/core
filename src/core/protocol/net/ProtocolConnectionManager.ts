import events = require('events');

import ConfigInterface = require('../../config/interfaces/ConfigInterface');
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

	constructor (config:ConfigInterface, tcpSocketHandler:TCPSocketHandlerInterface) {
		super();

		this._tcpSocketHandler = tcpSocketHandler;

		this._incomingDataPipeline = new IncomingDataPipeline(
			config.get('protocol.messages.maxByteLengthPerMessage'),
			MessageByteCheatsheet.messageEnd,
			config.get('protocol.messages.msToKeepNonAddressableMemory'),
			new ReadableMessageFactory()
		);

		this._incomingPendingTimeoutLength = config.get('protocol.messages.msToWaitForIncomingMessage');
		this._msToWaitForConnection = config.get('protocol.messages.maxSecondsToWaitForConnection') * 1000;

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
	 * @method {core.protocol.net.ProtocolConnectionManager#getConfirmedSocketList
	 *
	 * @returns {Array<string>}
	 */
	public getKeepOpenList ():Array<string> {
		return this._keepSocketOpenList;
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

	/**
	 * Adds a TCP socket to the confirmed list. Hooks an event to it that it gets destroyed when it's closed.
	 * Replaces old socket on same identifier, except when the new one is outgoing and the old one is incoming.
	 * Keeps it open when needed.
	 * Emits a `confirmedSocket` event in the end.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_addToConfirmed
	 *
	 * @param {string} identifier
	 * @param {stirng} direction 'incoming' or 'outgoing'
	 * @param {TCPSocketInterface} socket
	 */
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

	/**
	 * Adds a callback to the 'waiting for socket' list. Provides it with an index and a timeout (which destroys
	 * the waiting entry and calls the callback with `null`).
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_addToWaitingList
	 *
	 * @param {string} identifier
	 * @param {Function} callback The callback which should get called when the socket is there / an error occurs. Called with error and socket as arguments.
	 */
	private _addToWaitingList (identifier:string, callback:(err:Error, socket:TCPSocketInterface) => any):void {
		var existing = this._connectionWaitingList[identifier];
		var index = ++this._waitingListNum;

		var waitFor:WaitForSocket = {
			index   : index,
			callback: callback,
			timeout : this._createConnectionWaitingListTimeout(identifier, index)
		};

		if (!existing) {
			this._connectionWaitingList[identifier] = [];
		}

		this._connectionWaitingList[identifier].push(waitFor);
	}

	/**
	 * Finds a specific waiting entry in the connection waiting list and calls its callback as well as removing it
	 * from the array. Does not, however, clear the timeout (must be done manually).
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_callbackWaitingConnection
	 *
	 * @param {string} identifier Identifier under which to find the entry
	 * @param {string} index The index of the WaitForSocket item
	 * @param {Error} err Error paramter for the callback
	 * @param {TCPSocketInterface} sock Socket parameter for the callback
	 * @returns {WaitForSocket} The removed WaitForSocket entry
	 */
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
			retVal = this._connectionWaitingList[identifier].splice(_i, 1)[0];
			if (this._connectionWaitingList[identifier].length === 0) {
				delete this._connectionWaitingList[identifier];
			}
			item.callback(err, sock);
		}

		return retVal;
	}

	/**
	 * Creates a timeout for the connection waiting list. When it elapses, the callback stored next to it
	 * will be emitted with an error stating it was unable to obtain a successful connection.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_createConnectionWaitingListTimeout
	 *
	 * @param {string} identifier
	 * @param {number} index Index of the WaitForSocket-item stored in the array under the identifier
	 * @returns {number|NodeJS.Timer}
	 */
	private _createConnectionWaitingListTimeout (identifier:string, index:number):number {

		return setTimeout(() => {
			this._callbackWaitingConnection(identifier, index, new Error('ProtocolConnectionManager: Unable to obtain connection to ' + identifier), null);
		}, this._msToWaitForConnection);
	}

	/**
	 * Destroys a socket connection. Removes all references within the manager, clears any incmoing pending timeouts.
	 * unhooks it from the data pipeline and forces destroys the socket itself (removing all listeners and dumping the reference).
	 * Emits a `terminatedConnection` event if the socket was a confirmed one and the event should not be blocked.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_destroyConnection
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket The socket to destroy
	 * @param {boolean} blockTerminationEvent Indicates whether a `terminatedConnection` event should be blocked or not.
	 */
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

	/**
	 * Looks for a socket entry in the incoming pending list and in the confirmed list. If one is found, it is destroyed.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_destroyConnectionByIdentifier
	 *
	 * @param {string} identifier
	 */
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

	/**
	 * Tries to emit a `terminatedConnection`-event by making a valid ID out of the hexadecimal-string-identifier.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_emitTerminatedEventByIdentifier
	 *
	 * @param {string} identifier
	 */
	private _emitTerminatedEventByIdentifier (identifier:string) {
		try {
			var id = new Id(Id.byteBufferByHexString(identifier, 20), 160);
			this.emit('terminatedConnection', id);
		}
		catch (e) {
		}
	}

	/**
	 * Moves a socket from the incoming pending list to the confirmed list. Provides the socket with the new identifier
	 * and checks if there are any outgoing pending connections under the same one. If yes, they are marked with the
	 * `closeAtOnce` flag.
	 * Calls `_addToConfirmed` in the end.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_fromIncomingPendingToConfirmed
	 *
	 * @param {string} newIdentifier The new identifier
	 * @param {string} oldIdentifier The old temporary identifier
	 * @param {core.protocol.net.IncomingPendingSocket} pending The incoming pending socket object
	 */
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

	/**
	 * Returns a confirmed socket stored under the provided identifer. Returns `null` if there is none.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_getConfirmedSocketByIdentifier
	 *
	 * @param {string} identifier
	 * @returns {core.net.tcp.TCPSocketInterface}
	 */
	private _getConfirmedSocketByIdentifier (identifier:string):TCPSocketInterface {
		var existing = this._confirmedSockets[identifier];
		if (existing) {
			return existing.socket;
		}
		return null;
	}

	/**
	 * When the socket is closed remotely, make sure that the socket object is cleaned up.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_hookDestroyOnCloseToSocket
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 */
	private _hookDestroyOnCloseToSocket (socket:TCPSocketInterface) {
		// remote close
		socket.on('close', () => {
			this._destroyConnection(socket);
		});
	}

	/**
	 * Checks whether the provided identifier matches with the hexadecimal string representation of the provided
	 * node's ID.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_identifierAndContactNodeMatch
	 *
	 * @param {string} identifier Identifier to check
	 * @param {core.topology.ContactNodeInterface} node ContactNode whose ID to check against the identifier
	 * @returns {boolean} `True` if they match, else false
	 */
	private _identifierAndContactNodeMatch (identifier:string, node:ContactNodeInterface):boolean {
		return identifier === this._nodeToIdentifier(node);
	}

	/**
	 * Tries to open a client connection to the provided contactNode and adds a corresponding entry to the
	 * outgoing pending socket list.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_initiateOutgoingConnection
	 *
	 * @param {core.topology.ContactNodeInterface} contactNode
	 */
	private _initiateOutgoingConnection (contactNode:ContactNodeInterface):void {
		var identifier:string = this._nodeToIdentifier(contactNode);

		if (!this._outgoingPendingSockets[identifier]) {
			var outgoingEntry:OutgoingPendingSocket = {
				closeAtOnce: false
			};

			this._outgoingPendingSockets[identifier] = outgoingEntry;

			this._tryToOutgoingConnectToNode(contactNode, (socket:TCPSocketInterface) => {
				delete this._outgoingPendingSockets[identifier];
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
			});
		}
	}

	/**
	 * Returns the hexadecimal string representation of a node's ID
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_nodeToIdentifier
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 * @returns {string}
	 */
	private _nodeToIdentifier (node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

	/**
	 * The listener on the class's `confirmedSocket` event. When a confirmedSocket rolls in, it checks
	 * if there are any functions already waiting for the socket. If yes, they are iterated over and called one by one
	 * (in their original order), clearing their timeouts as well.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_onConfirmedSocket
	 *
	 * @param {string} identifier The identifier of the confirmed socket
	 * @param {core.net.tcp.TCPSocketInterface} socket The new confirmed socket itself.
	 */
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

	/**
	 * The listener on the TCP handler's `connected` event with 'incoming' as direction.
	 * Provides the socket with a temporary identifier, hooks it to the pipeline and adds it the incoming pending list.
	 * It also kicks off a timeout which destroys the socket when elapsed (this is cleared as soon as the socket gets
	 * a valid identifier)
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_onincomingConnection
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 */
	private _onIncomingConnection (socket:TCPSocketInterface):void {
		var identifier:string = this._setTemporaryIdentifier(socket);
		var pending:IncomingPendingSocket = {
			socket : socket,
			timeout: setTimeout(() => {
				this._destroyConnection(socket)
			}, this._incomingPendingTimeoutLength)
		};
		this._incomingPendingSockets[identifier] = pending;
		this._incomingDataPipeline.hookSocket(socket);
	}

	/**
	 * The listener on the pipeline's message event, when a valid readable message comes rolling in.
	 * Checks if the message came from an incoming socket with a temporary identifier. If so, it tries to assign it
	 * the ID of sender of the message.
	 * Otherwise it checks if the identifier of the socket and the sender of the message match. If not, the responsible
	 * socket is destroyed and the message not propagated, because it hints to some non-compliance with the protocol.
	 *
	 * Propagates the message in a `message` event if not stated otherwise.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_onMessage
	 *
	 * @param {string} identifier The identifier of the socket over which the message was sent
	 * @param {core.protocol.messages.ReadableMessageInterface} message The received message
	 */
	private _onMessage (identifier:string, message:ReadableMessageInterface):void {
		var propagateMessage:boolean = true;
		var incomingPending:IncomingPendingSocket = this._incomingPendingSockets[identifier];

		if (incomingPending) {
			var newIdentifier:string = this._nodeToIdentifier(message.getSender());
			this._fromIncomingPendingToConfirmed(newIdentifier, identifier, incomingPending);
		}
		else if (!(this._identifierAndContactNodeMatch(identifier, message.getSender()))) {
			console.log('wont propagate message');
			// does not seem to be the person it's supposed to be. we assume something is wrong here
			// and destroy the connection.
			propagateMessage = false;
			this._destroyConnectionByIdentifier(identifier);
		}

		if (propagateMessage) {
			console.log('propagating message');
			this.emit('message', message);
		}
	}

	/**
	 * Sets up all needed listeners, which is:
	 * - listening to messages of the data pipeline
	 * - listening to incoming connections of the TCP socket handler
	 * - internally hooking to the class's `confirmedSocket` event
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_setGlobalListeners
	 */
	private _setGlobalListeners ():void {
		this._incomingDataPipeline.on('message', (identifier:string, message:ReadableMessageInterface) => {
			console.log('got message from pipe.')
			this._onMessage(identifier, message);
		});

		this._tcpSocketHandler.on('connected', (socket:TCPSocketInterface, direction:string) => {
			if (direction === 'incoming') {
				this._onIncomingConnection(socket);
			}
		});

		this.on('confirmedSocket', this._onConfirmedSocket);
	}

	/**
	 * Provides the socket with a temporary identifier and returns the same.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_setTemporaryIdentifier
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 * @returns {string} The set identifier
	 */
	private _setTemporaryIdentifier (socket:TCPSocketInterface):string {
		var identifier:string = this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount);
		socket.setIdentifier(identifier);

		return identifier;
	}

	/**
	 * Tries to establish a client TCP connection to a contact node by iterating over its addresses and probing each one
	 * of them until a successful socket could be established or it runs out of addresses.
	 * A callback is called nevertheless, if success with the established socket as argument, else with `null`.
	 *
	 * @method core.protocol.net.ProtocolConnectionManager~_tryToOutgoingConnectToNode
	 *
	 * @param {core.topology.ContactNodeInterface} contactNode Node to connect to
	 * @param {Function} callback
	 */
	private _tryToOutgoingConnectToNode (contactNode:ContactNodeInterface, callback:(socket:TCPSocketInterface) => any) {
		var addresses:ContactNodeAddressListInterface = contactNode.getAddresses();
		var startAt:number = 0;
		var maxIndex:number = addresses.length - 1;
		var tcpSocketHandler:TCPSocketHandlerInterface = this._tcpSocketHandler;

		var connectToAddressByIndex = function (i:number, callback:(socket:TCPSocketInterface) => any) {
			var address:ContactNodeAddressInterface = addresses[i];
			tcpSocketHandler.connectTo(address.getPort(), address.getIp(), callback);
		};
		var theCallback = function (socket:TCPSocketInterface) {
			if (!socket) {
				if (++startAt <= maxIndex) {
					connectToAddressByIndex(startAt, theCallback);
					return;
				}
			}
			callback(socket);
		};

		connectToAddressByIndex(startAt, theCallback);
	}

}

export = ProtocolConnectionManager;