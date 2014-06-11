import events = require('events');

import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import TCPSocketInterface = require('../../net/tcp/interfaces/TCPSocketInterface');

class HydraConnectionManager extends events.EventEmitter implements HydraConnectionManagerInterface {

	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	private _keepMessageInPipelineForMs:number = 0;
	private _waitForReconnectMs:number = 0;
	private _retryConnectionMax:number = 0;


	private _openSockets:{[ip:string]:string;} = {};

	private _circuitNodes:{[ip:string]:HydraNode} = {};


	public constructor (hydraConfig:ConfigInterface, protocolConnectionManager:ProtocolConnectionManagerInterface) {
		super();

		this._protocolConnectionManager = protocolConnectionManager;
		this._keepMessageInPipelineForMs = hydraConfig.get('hydra.keepMessageInPipelineForSeconds') * 1000;
		this._waitForReconnectMs = hydraConfig.get('hydra.waitForReconnectInSeconds') * 1000;
		this._retryConnectionMax = hydraConfig.get('hydra.retryConnectionMax');

		this._setupListeners();
	}

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

	public pipeMessage (payload:Buffer, to:HydraNode):void {
		var openSocketIdent:string = this._openSockets[to.ip];

		if (openSocketIdent) {
			this._protocolConnectionManager.hydraWriteMessageTo(openSocketIdent, payload);
		}
		else {

			var messageListener = (identifier:string) => {
				this._protocolConnectionManager.hydraWriteMessageTo(identifier, payload);
				global.clearTimeout(messageTimeout);
			};

			var messageTimeout:number = global.setTimeout((listener) => {
				this.removeListener(to.ip, listener);
			}, this._keepMessageInPipelineForMs, messageListener);

			this.once(to.ip, messageListener);
		}
	}

	private _rehookConnection (node:HydraNode):void {
		if (!node.port) {
			// we have to wait
			var waitTimeout:number = global.setTimeout(() => {
				this.emit('globalConnectionFail', node.ip);
			}, this._waitForReconnectMs);

			this.once(node.ip, function () {
				global.clearTimeout(waitTimeout);
			});
		}
		else {
			// we need to force it
			var connect = (num:number) => {
				if (num < this._retryConnectionMax) {
					this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, (err:Error, ident:string) => {
						if (err) {
							connect(++num);
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
	}
}

export = HydraConnectionManager;