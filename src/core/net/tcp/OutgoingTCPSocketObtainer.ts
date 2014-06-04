/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

import TCPSocketFactoryInterface = require('./interfaces/TCPSocketFactoryInterface');
import TCPSocketInterface = require('./interfaces/TCPSocketInterface');
import TCPSocketOptions = require('./interfaces/TCPSocketOptions');

class OutgoingTCPSocketObtainer {

	private _factory:TCPSocketFactoryInterface = null;
	private _options:TCPSocketOptions = null;
	private _rawSocket:net.Socket = null;
	private _callback:(socket:TCPSocketInterface) => any = null;
	private _timeoutInMs:number = 0;

	private _errorListener:Function = null;
	private _connectListener:Function = null;
	private _connectionTimeout:number = 0;


	constructor (port:number, ip:string, callback:(socket:TCPSocketInterface) => any, factory:TCPSocketFactoryInterface, options:TCPSocketOptions, timeoutInMs) {

		this._factory = factory;
		this._options = options;
		this._callback = callback;
		this._timeoutInMs = timeoutInMs;

		this._errorListener = () => {
			this._rawSocket.destroy();
			this._rawSocket.removeListener('connect', this._connectListener);
			this._callback(null);
		};

		this._connectListener = () => {
			if (this._connectionTimeout) {
				global.clearTimeout(this._connectionTimeout);
			}

			var socket:TCPSocketInterface = this._factory.create(this._rawSocket, this._options);

			this._rawSocket.removeListener('error', this._errorListener);

			this._callback(socket);
		};

		this._connectionTimeout = global.setTimeout(() => {
			this._rawSocket.end();
			this._rawSocket.destroy();

			this._rawSocket.removeListener('error', this._errorListener);
			this._rawSocket.removeListener('connect', this._connectListener);
			this._callback(null);

		}, this._timeoutInMs);

		this._rawSocket = net.createConnection(port, ip);

		this._rawSocket.once('error', this._errorListener);
		this._rawSocket.once('connect', this._connectListener);
	}

}

export = OutgoingTCPSocketObtainer;