import events = require('events');

import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import TCPSocketInterface = require('../../net/tcp/interfaces/TCPSocketInterface');
import WritableHydraMessageFactoryInterface = require('./messages/interfaces/WritableHydraMessageFactoryInterface');
import ReadableHydraMessageFactoryInterface = require('./messages/interfaces/ReadableHydraMessageFactoryInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');

/**
 * HydraConnectionManagerInterface implementation.
 * See interface documentation for funtionality.
 *
 * @class core.protocol.hydra.HydraConnectionManager
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.hydra.HydraConnectionManagerInterface
 *
 * @param {core.config.ConfigInterface} hydraConfig Hydra configuration
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection Manager
 * @param {core.protocol.hydra.WritableHydraMessageFactoryInterface} writableFactory A writable hydra message factory instance.
 * @param {core.protocol.hydra.ReadableHydraMessageFactoryInterface} readableFactory A readable hydra message factory instance.
 */
class HydraConnectionManager extends events.EventEmitter implements HydraConnectionManagerInterface {

	/**
	 * Keeps track of how often a node has been added / removed to / fram the circuit node list.
	 * Only when the count is zero is it really removed from the circuit node list.
	 * This is because a node can be part of multiple circuits.
	 *
	 * @member {Object} core.protocol.hydra.HydraConnectionManager~_circuitNodeCount
	 */
	private _circuitNodeCount:{[ip:string]:number} = {};

	/**
	 * The key-value list of circuit nodes, where key is the IP address and value is the Node.
	 *
	 * @member {Object} core.protocol.hydra.HydraConnectionManager~_circuitNodes
	 */
	private _circuitNodes:{[ip:string]:HydraNode} = {};

	/**
	 * The number of ms a message which cannot be sent should be kept in the pipeline to wait for a connection
	 * until it is discarded.
	 *
	 * @member {number} core.protocol.hydra.HydraConnectionManager~_keepMessageInPipelineForMs
	 */
	private _keepMessageInPipelineForMs:number = 0;

	/**
	 * The key-value list of open sockets, where key is the IP address and value is the identifier of the socket.
	 *
	 * @member {Object} core.protocol.hydra.HydraConnectionManager~_openSockets
	 */
	private _openSockets:{[ip:string]:string;} = {};

	/**
	 * The working protocol connection manager.
	 *
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.hydra.HydraConnectionManager~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * The readable hydra message factory.
	 *
	 * @member {core.protocol.hydra.ReadableHydraMessageFactoryInterface} core.protocol.hydra.HydraConnectionManager~_readableFactory
	 */
	private _readableFactory:ReadableHydraMessageFactoryInterface = null;

	/**
	 * The number of maximum retries when trying to regain a connection to a circuit node, before a `globalConnectionFail`
	 * event is emitted.
	 * This is only relevant if there is knowledge of a reachable port of the HydraNode.
	 *
	 * @member {number} core.protocol.hydra.HydraConnectionManager~_retryConnectionMax
	 */
	private _retryConnectionMax:number = 0;

	/**
	 * The number of milliseconds to wait for a reconnect to a circuit node (without knowledge of its port), until a
	 * `globalConnectionFail` event is emitted.
	 * This is only relevant if there is NO knowledge of a reachable port of the HydraNode
	 *
	 * @member {number} core.protocol.hydra.HydraConnectionManager~_waitForReconnectMs
	 */
	private _waitForReconnectMs:number = 0;

	/**
	 * The writable hydra message factory.
	 *
	 * @member {core.protocol.hydra.WritableHydraMessageFactoryInterface} core.protocol.hydra.HydraConnectionManager~_writableFactory
	 */
	private _writableFactory:WritableHydraMessageFactoryInterface = null;


	public constructor (hydraConfig:ConfigInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, writableFactory:WritableHydraMessageFactoryInterface, readableFactory:ReadableHydraMessageFactoryInterface) {
		super();

		this._writableFactory = writableFactory;
		this._readableFactory = readableFactory;
		this._protocolConnectionManager = protocolConnectionManager;
		this._keepMessageInPipelineForMs = hydraConfig.get('hydra.keepMessageInPipelineForSeconds') * 1000;
		this._waitForReconnectMs = hydraConfig.get('hydra.waitForReconnectInSeconds') * 1000;
		this._retryConnectionMax = hydraConfig.get('hydra.retryConnectionMax');

		this._setupListeners();
	}

	/**
	 * BEGIN Testing purposes only
	 */

	public getOpenSocketList ():Object {
		return this._openSockets;
	}

	public getCircuitNodeList ():Object {
		return this._circuitNodes;
	}

	public getCircuitNodeCount ():Object {
		return this._circuitNodeCount;
	}

	/**
	 * END Testing purposes only
	 */

	public addToCircuitNodes (node:HydraNode):void {
		var ip:string = node.ip;

		if (!this._circuitNodes[ip]) {
			this._circuitNodes[ip] = node;
			this._circuitNodeCount[ip] = 1;

			var ident:string = this._openSockets[ip];
			if (ident) {
				this._protocolConnectionManager.keepHydraSocketOpen(ident);
			}
		}
		else {
			this._circuitNodeCount[ip]++;
		}
	}

	public removeFromCircuitNodes (node:HydraNode):void {
		var ip:string = node.ip;

		if (this._circuitNodeCount[ip]) {
			if (--this._circuitNodeCount[ip] === 0) {
				delete this._circuitNodeCount[ip];
				delete this._circuitNodes[ip];

				var ident:string = this._openSockets[ip];
				if (ident) {
					this._protocolConnectionManager.keepHydraSocketNoLongerOpen(ident);
				}
			}
		}
	}

	public pipeMessage (messageType:string, payload:Buffer, to:HydraNode, circuitId?:string):void {
		var openSocketIdent:string = this._openSockets[to.ip];
		var sendableBuffer:Buffer = this._writableFactory.constructMessage(messageType, payload, payload.length, circuitId);

		if (openSocketIdent) {
			this._protocolConnectionManager.hydraWriteMessageTo(openSocketIdent, sendableBuffer);
		}
		else {

			var messageListener = (identifier:string) => {
				this._protocolConnectionManager.hydraWriteMessageTo(identifier, sendableBuffer);
				global.clearTimeout(messageTimeout);
			};

			var messageTimeout:number = global.setTimeout((listener) => {
				this.removeListener(to.ip, listener);
			}, this._keepMessageInPipelineForMs, messageListener);

			this.once(to.ip, messageListener);

			if (to.port) {
				this._protocolConnectionManager.hydraConnectTo(to.port, to.ip);
			}
		}
	}

	/**
	 * 'Rehooks' the connection to a node. If there is knowledge of a reachable port, it tries to acitvely connect to it.
	 * If there is NO knowledge of a reachable port, the manager simply waits for a specific time for a reconnect
	 * initiated by the other side.
	 *
	 * If the reconnect fails, or the timeout elapses, a `globalConnectionFail` event is emitted with the IP as parameter,
	 * so that other classes can act accordingly (e.g. tearing down circuits etc.)
	 *
	 * @method core.protocol.hydra.HydraConnectionManager~_rehookConnection
	 *
	 * @param {core.protocol.HydraNode} node The node to 'reconnect' to
	 */
	private _rehookConnection (node:HydraNode):void {
		if (!node.port) {
			// we have to wait
			var waitTimeout:number = global.setTimeout(() => {
				this.emit('globalConnectionFail', node.ip);
			}, this._waitForReconnectMs);

			this.once(node.ip, () => {
				global.clearTimeout(waitTimeout);
				this.emit('reconnectedTo', node.ip);
			});
		}
		else {
			// we need to force it
			var connect = (num:number) => {
				if (num < this._retryConnectionMax) {
					this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, (err:Error) => {
						if (err) {
							connect(++num);
						}
						else {
							this.emit('reconnectedTo', node.ip);
						}
					});
				}
				else {
					this.emit('globalConnectionFail', node.ip);
				}
			}

			connect(0);
		}
	}

	/**
	 * Sets up the listeners on the protocol connection manager.
	 *
	 * @method core.protoco.hydra.HydraConnectionManager~_setupListeners
	 */
	private _setupListeners ():void {
		this._protocolConnectionManager.on('hydraSocket', (identifier:string, socket:TCPSocketInterface) => {
			var ip:string = socket.getIP();

			if (ip && !this._openSockets[ip]) {
				this._openSockets[ip] = identifier;

				if (this._circuitNodes[ip]) {
					this._protocolConnectionManager.keepHydraSocketOpen(identifier);
				}

				this.emit(ip, identifier);
			}
			else {
				socket.end();
			}
		});

		this._protocolConnectionManager.on('terminatedConnection', (identifier:string) => {
			var ips:Array<string> = Object.keys(this._openSockets);
			var ipsLength:number = ips.length;
			var theIp:string = null;

			for (var i = 0; i < ipsLength; i++) {
				if (this._openSockets[ips[i]] === identifier) {
					theIp = ips[i];
				}
			}

			if (theIp) {
				delete this._openSockets[theIp];
			}

			var node:HydraNode = this._circuitNodes[theIp];
			if (node) {
				this._rehookConnection(node);
			}
		});

		this._protocolConnectionManager.on('hydraMessage', (identifier:string, ip:string, message:ReadableMessageInterface) => {
			var msgToEmit:ReadableHydraMessageInterface = null;

			try {
				msgToEmit = this._readableFactory.create(message.getPayload());
			}
			catch (e) {

			}

			if (msgToEmit && ip) {
				this.emit('hydraMessage', ip, msgToEmit);
			}
		});
	}
}

export = HydraConnectionManager;