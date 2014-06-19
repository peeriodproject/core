import events = require('events');

import HydraNode = require('./interfaces/HydraNode');
import HydraNodeList = require('./interfaces/HydraNodeList');

import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import WritableHydraMessageFactoryInterface = require('./messages/interfaces/WritableHydraMessageFactoryInterface');
import ReadableHydraMessageFactoryInterface = require('./messages/interfaces/ReadableHydraMessageFactoryInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');

/**
 * ConnectionManagerInterface implementation.
 *
 * @class core.protocol.hydra.ConnectionManager
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.hydra.ConnectionManagerInterface
 *
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection manager.
 * @param {core.protocol.hydra.WritableHydraMessageFactoryInterface} writableFactory
 * @param {core.protocol.hydra.ReadableHydraMessageFactoryInterface} readableFactory
 */
class ConnectionManager extends events.EventEmitter implements ConnectionManagerInterface {

	/**
	 * The list of circuit nodes assigned to specific sockets.
	 *
	 * @member {{[identifier:string]:HydraNode}} core.protocol.hydra.ConnectionManager~_circuitNodes
	 */
	private _circuitNodes:{[identifier:string]:HydraNode} = {};

	/**
	 * Pipeline for messages. Messages aggregate here until one socket has been established.
	 *
	 * @member {{[circuitId:string]:Array<Buffer>}} core.protocol.hydra.ConnectionManager~_circuitPipeline
	 */
	private _circuitPipeline:{[circuitId:string]:Array<Buffer>} = {};

	/**
	 * @member {core.protocol.hydra.ReadableHydraMessageFactoryInterface} core.protocol.hydra.ConnectionManager~_readableFactory
	 */
	private _readableFactory:ReadableHydraMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.hydra.ConnectionManager~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.ConnectionManager~_writableFactory
	 */
	private _writableFactory:WritableHydraMessageFactoryInterface = null;

	public constructor (protocolConnectionManager:ProtocolConnectionManagerInterface, writableFactory:WritableHydraMessageFactoryInterface, readableFactory:ReadableHydraMessageFactoryInterface) {
		super();

		this._protocolConnectionManager = protocolConnectionManager;
		this._writableFactory = writableFactory;
		this._readableFactory = readableFactory;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getCircuitNodes ():{[identifier:string]:HydraNode} {
		return this._circuitNodes;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public addToCircuitNodes (socketIdentifier:string, node:HydraNode) {
		node.socketIdentifier = socketIdentifier;
		this._circuitNodes[socketIdentifier] = node;
		this._protocolConnectionManager.keepHydraSocketOpen(socketIdentifier);
	}

	public pipeCircuitMessageTo (node:HydraNode, messageType:string, payload:Buffer, skipCircIdOnConstruction?:boolean) {
		var sendableBuffer:Buffer = null;
		var circuitId:string = node.circuitId;

		try {
			sendableBuffer = this._writableFactory.constructMessage(messageType, payload, payload.length, skipCircIdOnConstruction ? null : node.circuitId);
		}
		catch (e) {
			return;
		}

		if (!node.socketIdentifier) {
			if (!this._circuitPipeline[circuitId]) {
				this._circuitPipeline[circuitId] = [];

				this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, (err:Error, identifier:string) => {
					if (!err && identifier) {
						this.addToCircuitNodes(identifier, node);

						var pipeline = this._circuitPipeline[circuitId];

						for (var i = 0, l = pipeline.length; i < l; i++) {
							this._protocolConnectionManager.hydraWriteMessageTo(identifier, pipeline[i]);
						}

					}

					delete this._circuitPipeline[circuitId];
				});
			}

			this._circuitPipeline[circuitId].push(sendableBuffer);
		}
		else if (this._circuitNodes[node.socketIdentifier]) {
			this._protocolConnectionManager.hydraWriteMessageTo(node.socketIdentifier, sendableBuffer);
		}
	}

	public pipeMessageTo (node:HydraNode, messageType:string, payload:Buffer) {
		var sendableBuffer:Buffer = null;

		try {
			sendableBuffer = this._writableFactory.constructMessage(messageType, payload, payload.length, node.circuitId);
		}
		catch (e) {
			return;
		}

		this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, (err:Error, identifier:string) => {
			if (!err && identifier) {
				this._protocolConnectionManager.hydraWriteMessageTo(identifier, sendableBuffer);
			}
		});
	}

	public removeFromCircuitNodes (node:HydraNode):HydraNode {
		return this._removeFromCircuitNodesByIdentifier(node.socketIdentifier);
	}

	/**
	 * Removes a node from the circuit list by the socket identifier.
	 *
	 * @method core.protocol.hydra.ConnectionManager~_removeFromCircuitNodesByIdentifier
	 *
	 * @param {string} identifier Socket identifier.
	 * @returns {core.protocol.hydra.HydraNode} node The removed node. `undefined` if the node was not present.
	 */
	private _removeFromCircuitNodesByIdentifier (identifier:string):HydraNode {

		if (identifier) {
			var circNode:HydraNode = this._circuitNodes[identifier];

			if (circNode) {
				this._protocolConnectionManager.keepHydraSocketNoLongerOpen(identifier);
				delete this._circuitNodes[identifier];

				return circNode;
			}
		}

		return undefined;
	}

	/**
	 * Sets up the listeners on the protocol connection manager so that they can be propagated.
	 *
	 * @method core.protocol.hydra.ConnectionManager~_setupListeners
	 */
	private _setupListeners ():void {

		this._protocolConnectionManager.on('terminatedConnection', (identifier:string) => {
			var circuitNode:HydraNode = this._removeFromCircuitNodesByIdentifier(identifier);

			if (circuitNode) {
				this.emit('circuitTermination', circuitNode.circuitId);
			}
		});

		this._protocolConnectionManager.on('hydraMessage', (identifier:string, ip:string, message:ReadableMessageInterface) => {
			var msgToEmit:ReadableHydraMessageInterface = null;

			try {
				msgToEmit = this._readableFactory.create(message.getPayload());
			}
			catch (e) {

			}

			if (msgToEmit) {
				var circuitNode:HydraNode = this._circuitNodes[identifier];

				if (circuitNode) {
					if (circuitNode.circuitId === msgToEmit.getCircuitId()) {
						this.emit('circuitMessage', msgToEmit, circuitNode);
					}
				}
				else {
					this.emit('message', msgToEmit, identifier);
				}
			}
		});
	}

}

export = ConnectionManager;


