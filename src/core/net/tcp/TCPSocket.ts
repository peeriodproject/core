import events = require('events');
import net = require('net');

import TCPSocketInterface = require('./interfaces/TCPSocketInterface');
import TCPSocketOptions = require('./interfaces/TCPSocketOptions');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * TCP Socket implementation.
 *
 * @class core.net.tcp.TCPSocket
 * @extends events.EventEmitter
 * @implements core.net.tcp.TCPSocketInterface
 *
 * @param {net.Socket} node.js socket instance
 * @param {core.net.tcp.TCPSocketOptions} options
 */
class TCPSocket extends events.EventEmitter implements TCPSocketInterface {

	/**
	 * Flag which indicates if an idle socket will be closed on a `timeout` event.
	 *
	 * @member {boolean} TCPSocket~_closeOnTimeout
	 */
	private _closeOnTimeout:boolean = false;

	/**
	 * List of event names of net.Socket which will be simply propagated on emission
	 *
	 * @member {string[]} TCPSocket~_eventsToPropagate
	 */
	private _eventsToPropagate:Array<string> = ['data', 'close', 'error'];

	/**
	 * Identification string.
	 *
	 * @member {string} TCPSocket~_identifier
	 */
	private _identifier:string = '';

	/**
	 * node.js socket instance
	 *
	 * @member {net.Socket} TCPSocket~_socket
	 */
	private _socket:net.Socket = null;

	/**
	 * The options passed in the constructor (for reference)
	 *
	 * @member {core.net.TCPSocketOptions} TCPSocket~_constructorOpts
	 */
	private _constructorOpts:TCPSocketOptions = null;


	public constructor (socket:net.Socket, opts:TCPSocketOptions) {
		super();

		if (!(socket && socket instanceof net.Socket)) {
			throw new Error('TCPSocket.constructor: Invalid or no socket specified');
		}

		this.setSocket(socket);

		this._constructorOpts = opts;

		// disable nagle algorithm
		socket.setNoDelay();

		// set keep-alive
		if (opts.doKeepAlive) {
			this.getSocket().setKeepAlive(true, opts.keepAliveDelay || 0);
		}

		// set the timeout
		if (opts.idleConnectionKillTimeout > 0) {
			this._closeOnTimeout = true;
			this.getSocket().setTimeout(opts.idleConnectionKillTimeout * 1000);
		}

		this.setupListeners();
	}

	public end (data?:any, encoding?:string):void {
		this.getSocket().end(data, encoding);
	}

	public forceDestroy():void {
		this._closeOnTimeout = false;
		this.getSocket().removeAllListeners();
		try {
			this.getSocket().end();
			this.getSocket().destroy();
		}
		catch (e) {}
		this._socket = null;
		this.emit('destroy');
		this.removeAllListeners();
	}

	public getIdentifier ():string {
		return this._identifier;
	}

	public getIPPortString ():string {
		var socket = this.getSocket();

		return socket.remoteAddress + ':' + socket.remotePort;
	}

	public getSocket ():net.Socket {
		return this._socket;
	}

	public onTimeout ():void {
		if (this._closeOnTimeout) {
			this.end();
		}
	}

	public setCloseOnTimeout (flag:boolean):void {
		if (!this._closeOnTimeout && flag) {
			this.getSocket().setTimeout(this._constructorOpts.idleConnectionKillTimeout * 1000);
		}

		this._closeOnTimeout = flag;
	}

	public setIdentifier (identifier:string):void {
		if (this._identifier && (this._identifier !== identifier)) {
			var oldIdentifier:string = this._identifier;
			this.emit('identifierChange', oldIdentifier, identifier);
		}
		this._identifier = identifier;
	}

	public setSocket (socket:net.Socket) {
		this._socket = socket;
	}

	public setupListeners ():void {
		var socket = this.getSocket();

		socket.on('timeout', () => this.onTimeout());

		this._propagateEvents(this._eventsToPropagate);
	}

	public writeBuffer (buffer:NodeBuffer, callback?:Function):boolean {
		var success = false;

		try {
			success = this.getSocket().write(buffer, callback);
		}
		catch (e) {
			logger.error('TCP socket write error', {error: e.message});
			this.forceDestroy();
		}


		buffer = null;

		return success;
	}

	public writeString (message:string, encoding:string = 'utf8', callback?:Function):boolean {
		var success = false;

		try {
			success = this.getSocket().write(message, encoding, callback);
		}
		catch (e) {
			this.forceDestroy();
		}

		return success;
	}

	/**
	 * Takes an array of event names and propagates the corresponding node.js's net.Socket events,
	 * so that the raw socket doesn't have to be accessed.
	 *
	 * @method core.net.tcp.TCPSocket~propagateEvents
	 *
	 * @param {Array<string>} events
	 */
	private _propagateEvents (events:Array<string>):void {
		events.forEach((event) => {
			((evt) => {
				this.getSocket().on(evt, () => this.emit.apply(this, [evt].concat(Array.prototype.splice.call(arguments, 0))));
			})(event);
		});
	}

}

export = TCPSocket;