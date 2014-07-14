import MiddlewareInterface = require('./interfaces/MiddlewareInterface');
import WritableFileTransferMessageFactoryInterface = require('./messages/interfaces/WritableFileTransferMessageFactoryInterface');
import CellManagerInterface = require('../hydra/interfaces/CellManagerInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import HydraMessageCenterInterface = require('../hydra/interfaces/HydraMessageCenterInterface');
import HydraNodeList = require('../hydra/interfaces/HydraNodeList');
import HydraNode = require('../hydra/interfaces/HydraNode');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * MiddlewareInterface implementation.
 *
 * @class core.protocol.fileTransfer.Middleware
 * @implements core.protocol.fileTransfer.MiddlewareInterface
 *
 * @param {core.protocol.hydra.CellManagerInterface} A working hydra cell manager.
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} A working protocol connection manager.
 * @param {core.protocol.hydra.HydraMessageCenterInterface} A working hydra message center.
 * @param {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} Factory for writable FILE_TRANSFER messages
 */
class Middleware implements MiddlewareInterface {

	/**
	 * Stores the hydra cell manager instance.
	 *
	 * @member {core.protocol.hydra.CellManagerInterface} core.protocol.fileTransfer.Middleware~_cellManager
	 */
	private _cellManager:CellManagerInterface = null;

	/**
	 * Stores the hydra message center.
	 *
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.fileTransfer.Middleware~_hydraMessageCenter
	 */
	private _hydraMessageCenter:HydraMessageCenterInterface = null;

	/**
	 * Stores references to incoming middleware sockets assigned to the identifier of the circuit through which the messages should
	 * be piped through.
	 *
	 * @member {Object} core.protocol.fileTransfer.Middleware~_incomingSockets
	 */
	private _incomingSockets:{[circuitId:string]:Array<string>} = {};

	/**
	 * Stores references to outgoing middleware sockets assigned to the concatenation of the fed node's attributes + the circuit
	 * through which the EXTERNAL_FEED message came.
	 *
	 * @member {Object} core.protocol.fileTransfer.Middleware~_outgoingSockets
	 */
	private _outgoingSockets:{[concatIdent:string]:string} = {};

	/**
	 * Stores the protocol connection manager.
	 *
	 * @member {core.protocol.net.ProtcolConnectionManagerInterface} core.protocol.fileTransfer.Middleware~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * Stores the factory for writable FILE_TRANSFER messages
	 *
	 * @member {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} core.protocol.fileTransfer.Middleware~_writableFileTransferMessageFactory
	 */
	private _writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface = null;

	public constructor (cellManager:CellManagerInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, hydraMessageCenter:HydraMessageCenterInterface, writableFileTransferMessageFactory:WritableFileTransferMessageFactoryInterface) {
		this._cellManager = cellManager;
		this._protocolConnectionManager = protocolConnectionManager;
		this._hydraMessageCenter = hydraMessageCenter;
		this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getOutgoingList ():any {
		return this._outgoingSockets;
	}

	public getIncomingList ():any {
		return this._incomingSockets;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public addIncomingSocket (circuitId:string, socketIdentifier:string):void {
		var existing:Array<string> = this._incomingSockets[circuitId];

		if (existing) {
			existing.push(socketIdentifier);
		}
		else {
			this._incomingSockets[circuitId] = [socketIdentifier];
		}
	}

	public closeSocketByIdentifier (socketIdentifier:string):void {
		this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
	}

	public feedNode (feedingNodes:HydraNodeList, associatedCircuitId:string, payloadToFeed:Buffer):void {
		logger.log('middleware', 'Trying to feed hydra');

		var fed:boolean = false;

		for (var i=0, l=feedingNodes.length; i<l; i++) {
			var node:HydraNode = feedingNodes[i];
			var existingSocket:string = this._outgoingSockets[this._constructOutgoingKey(node, associatedCircuitId)];

			if (existingSocket) {
				this._feedSocket(existingSocket, node.feedingIdentifier, payloadToFeed);
				fed = true;
				break;
			}
		}

		if (!fed) {
			this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed);
		}
	}

	/**
	 * Self explanatory method. Used for assigning outgoing socket identifiers to nodes / circuits.
	 *
	 * @method core.protocol.fileTransfer.Middleware~_constructOutgoingKey
	 *
	 * @param {core.protocol.hydra.HydraNode} node The potential node to feed.
	 * @param {string} circuitId The identifier of the circuit through which the EXTERNAL_FEED message came through
	 * @returns {string} The concatenation used as identifier to assign a socket to.
	 */
	private _constructOutgoingKey(node:HydraNode, circuitId:string):string {
		return circuitId + '_' + node.ip + '_' + node.port + '_' + node.feedingIdentifier;
	}

	/**
	 * Wraps a payload ina GOT_FED message, which again is wrapped in a FILE_TRANSFER message, and pipes it through
	 * the TCP hydra socket stored under the given identifier (in the protocol connection manager).
	 *
	 * @method core.protocol.fileTransfer.Middleware~_feedSocket
	 *
	 * @param {string} socketIdentifier The TCP hydra socket to use.
	 * @param {string} feedingIdentifier The feedingIdentifier of the node to feed. This is used as transferId for the FILE_TRANSFER message.
	 * @param {Buffer} payloadToFeed The complete buffer of the message to feed.
	 */
	private _feedSocket (socketIdentifier:string, feedingIdentifier:string, payloadToFeed:Buffer):void {
		var bufferToSend:Buffer = null;

		try {
			bufferToSend = this._hydraMessageCenter.wrapFileTransferMessage(this._writableFileTransferMessageFactory.constructMessage(feedingIdentifier, 'GOT_FED', payloadToFeed));
		}
		catch(e) {
		}

		if (bufferToSend) {
			logger.log('middleware', 'Actually feeding hydra socket');

			this._protocolConnectionManager.hydraWriteMessageTo(socketIdentifier, bufferToSend);
		}
	}

	/**
	 * Tries to open a TCP socket to one of the nodes of the provided list. This is done in the fashion described in
	 * {@link core.protocol.fileTransfer.MiddlewareInterface}.
	 * As soon as a connection has been established, the payload is fed to it.
	 *
	 * @method core.protocol.fileTransfer.Middleware~_obtainConnectionAndFeed
	 *
	 * @param {core.protocol.hydra.HydraNodeList} feedingNodes List of potential nodes to feed. The payload is of course, however, only fed to ONE node.
	 * @param {string} associatedCircuitId The identifier of the circuit which the originating EXTERNAL_FEED message came through
	 * @param {Buffer} payloadToFeed The payload to feed.
	 * @param {Array<number>} usedIndices Optional, and only used internally if a follow-up call to this method must be performed. Indicates which nodes in the
	 * list have already been probed.
	 */
	private _obtainConnectionAndFeed(feedingNodes:HydraNodeList, associatedCircuitId:string, payloadToFeed:Buffer, usedIndices:Array<number> = []):void {
		var feedingNodesLength = feedingNodes.length;

		if (usedIndices.length !== feedingNodesLength) {

			var randIndex:number = Math.floor(Math.random() * feedingNodesLength);

			if (usedIndices.indexOf(randIndex) >= 0) {
				this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed, usedIndices);
			}
			else {
				var node:HydraNode = feedingNodes[randIndex];

				usedIndices.push(randIndex);

				this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, (err:Error, identifier:string) => {
					if (!err && identifier) {

						this._outgoingSockets[this._constructOutgoingKey(node, associatedCircuitId)] = identifier;

						this._feedSocket(identifier, node.feedingIdentifier, payloadToFeed);
					}
					else {
						this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed, usedIndices);
					}
				});
			}
		}
	}

	/**
	 * Sets up the appropriate listeners on the cell manager and the protocol connection manager. Called in constructor.
	 *
	 * @method core.protocol.fileTransfer.Middleware~_setupListeners
	 */
	private _setupListeners ():void {
		this._cellManager.on('tornDownCell', (circuitId:string) => {
			var incomingSockets:Array<string> = this._incomingSockets[circuitId];

			if (incomingSockets && incomingSockets.length) {
				for (var i=0, l=incomingSockets.length; i<l; i++) {
					this._protocolConnectionManager.closeHydraSocket(incomingSockets[i]);
				}

				delete this._incomingSockets[circuitId];
			}

			var outgoingSocketsKeys:Array<string> = Object.keys(this._outgoingSockets);

			for (var i=0, l=outgoingSocketsKeys.length; i<l; i++) {
				var key:string = outgoingSocketsKeys[i];

				if (key.indexOf(circuitId) === 0) {
					this._protocolConnectionManager.closeHydraSocket(this._outgoingSockets[key]);

					delete this._outgoingSockets[key];
				}
			}
		});

		this._protocolConnectionManager.on('terminatedConnection', (identifier:string) => {
			// we do not care for the incoming sockets, they clean themselves up as soon as the circuit is torn down
			// we only care for the outgoing sockets

			var outgoingSocketsKeys:Array<string> = Object.keys(this._outgoingSockets);

			for (var i=0, l=outgoingSocketsKeys.length; i<l; i++) {
				var key:string = outgoingSocketsKeys[i];

				if (this._outgoingSockets[key] === identifier) {
					delete this._outgoingSockets[key];
					break;
				}
			}
		});
	}

}

export = Middleware;