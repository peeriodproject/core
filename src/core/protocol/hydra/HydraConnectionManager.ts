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

class HydraConnectionManager extends events.EventEmitter implements HydraConnectionManagerInterface {

	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	private _keepMessageInPipelineForMs:number = 0;
	private _waitForReconnectMs:number = 0;
	private _retryConnectionMax:number = 0;


	private _openSockets:{[ip:string]:string;} = {};

	private _circuitNodes:{[ip:string]:HydraNode} = {};

	private _writableFactory:WritableHydraMessageFactoryInterface = null;
	private _readableFactory:ReadableHydraMessageFactoryInterface = null;


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

	/**
	 * END Testing purposes only
	 */

	public addToCircuitNodes (node:HydraNode):void {
		var ip:string = node.ip;

		if (!this._circuitNodes[ip]) {
			this._circuitNodes[ip] = node;

			var ident:string = this._openSockets[ip];
			if (ident) {
				this._protocolConnectionManager.keepHydraSocketOpen(ident);
			}
		}
	}

	public removeFromCircuitNodes (node:HydraNode):void {
		var ip:string = node.ip;

		delete this._circuitNodes[ip];

		var ident:string = this._openSockets[ip];
		if (ident) {
			this._protocolConnectionManager.keepHydraSocketNoLongerOpen(ident);
		}

	}

	public pipeMessage (messageType:string, payload:Buffer, to:HydraNode):void {
		var openSocketIdent:string = this._openSockets[to.ip];
		var sendableBuffer:Buffer = this._writableFactory.constructMessage(messageType, payload, payload.length);

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

			for (var i=0; i<ipsLength; i++) {
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