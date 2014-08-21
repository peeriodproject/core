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
	 * Flag which indicates if an idle socket will be closed. This is true by default and only set to `false` if
	 * otherwise stated in the constructor options.
	 *
	 * @member {boolean} core.net.tcp.TCPSocket~_closeWhenIdle
	 */
	private _closeWhenIdle:boolean = true;

	private _closeAfterLastDataReceivedInMs:number = 0;

	private _idleTimeout:number = 0;

	private _heartbeatTimeout:number = 0;

	private _sendHeartbeatAfterLastDataInMs:number = 0;

	private _doKeepOpen:boolean = false;

	/**
	 * The options passed in the constructor (for reference)
	 *
	 * @member {core.net.TCPSocketOptions} core.net.tcp.TCPSocket~_constructorOpts
	 */
	private _constructorOpts:TCPSocketOptions = null;

	/**
	 * Identification string.
	 *
	 * @member {string} core.net.tcp.TCPSocket~_identifier
	 */
	private _identifier:string = '';

	/**
	 * If this is set (for testing purposes only), this number of milliseconds) is
	 * used to simulate a Round trip time. All writes to the socket are delayed by the specified ms.
	 *
	 * @member {number} core.net.tcp.TCPSocket~_simulatorRTT
	 */
	private _simulatorRTT:number = 0;

	/**
	 * node.js socket instance
	 *
	 * @member {net.Socket} core.net.tcp.TCPSocket~_socket
	 */
	private _socket:net.Socket = null;

	private _preventWrite:boolean = false;

	private _errorListener:Function = null;

	private _closeListener:Function = null;

	private _drainListener:Function = null;

	private _dataListener:Function = null;

	private _endListener:Function = null;

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
			this.getSocket().setKeepAlive(true, opts.keepAliveDelay || 180000);
		}

		this._simulatorRTT = opts.simulatorRTT || 0;

		// set the timeout
		if (opts.idleConnectionKillTimeout === 0) {
			this._closeWhenIdle = false;
		}
		else {
			this._closeAfterLastDataReceivedInMs = opts.idleConnectionKillTimeout * 1000;
		}

		this._sendHeartbeatAfterLastDataInMs = opts.heartbeatTimeout * 1000;

		this._setupListeners();

		this._resetIdleTimeout();
		this._resetHeartbeatTimeout();

		if (global.socketCount === undefined) {
			global.socketCount = 0;
		}

		global.socketCount++;
		console.log('Number of open sockets %o', global.socketCount);
	}

	public end (data?:any, encoding?:string):void {

		if (this._socket && !this._preventWrite) {
			this._preventWrite = true;

			this._clearHeartbeatAndIdleTimeouts();

			this._socket.end(data, encoding);
		}
	}

	public getIdentifier ():string {
		return this._identifier;
	}

	public getIP ():string {
		return this._socket.remoteAddress;
	}

	public getIPPortString ():string {
		return this._socket.remoteAddress + ':' + this._socket.remotePort;
	}

	public getSocket ():net.Socket {
		return this._socket;
	}

	public setKeepOpen (state:boolean):void {
		this._doKeepOpen = state;
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

	private _clearHeartbeatAndIdleTimeouts ():void {
		if (this._idleTimeout) {
			global.clearTimeout(this._idleTimeout);
			this._idleTimeout = null;
		}

		if (this._heartbeatTimeout) {
			global.clearTimeout(this._heartbeatTimeout);
			this._heartbeatTimeout = null;
		}
	}

	private _setupListeners ():void {

		this._errorListener = (err:Error) => {
			logger.error('THIS IS A SOCKET ERROR!', {
			 emsg: err.message,
			 //stack:err.stack,
			 //trace: {
			 // typeName: trace.getTypeName(),
			 // fnName  : trace.getFunctionName(),
			 // fileName: trace.getFileName(),
			 // line    : trace.getLineNumber()
			 // },
			 ident: this.getIdentifier()
			 });

			this._preventWrite = true;
			this.emit('error', err);
		};
		this._socket.on('error', this._errorListener);

		this._closeListener = (had_error:boolean) => {
			this._socket.destroy();

			this._socket.removeListener('error', this._errorListener);
			this._socket.removeListener('close', this._closeListener);
			this._socket.removeListener('end', this._endListener);
			this._socket.removeListener('data', this._dataListener);
			this._socket.removeListener('drain', this._drainListener);

			this._preventWrite = true;
			this._socket = null;

			this.emit('close', had_error);

			this._clearHeartbeatAndIdleTimeouts();

			process.nextTick(() => {
				this.removeAllListeners();
			});

			global.socketCount--;
			console.log('Number of open sockets %o', global.socketCount);
		};
		this._socket.on('close', this._closeListener);

		this._endListener = () => {
			this._preventWrite = true;
			this.emit('end');
		};
		this._socket.on('end', this._endListener);

		this._dataListener = (data:Buffer) => {
			this._resetIdleTimeout();

			this.emit('data', data);
		};
		this._socket.on('data', this._dataListener);

		this._drainListener = () => {
			this._resetHeartbeatTimeout();
		};
		this._socket.on('drain', this._drainListener);

	}

	private _resetIdleTimeout ():void {
		if (this._idleTimeout) {
			global.clearTimeout(this._idleTimeout);
		}

		this._idleTimeout = global.setTimeout(() => {
			this._idleTimeout = null;

			if (this._closeWhenIdle) {
				this.end();
			}
		}, this._closeAfterLastDataReceivedInMs);
	}

	private _resetHeartbeatTimeout ():void {
		if (this._heartbeatTimeout) {
			global.clearTimeout(this._heartbeatTimeout);
		}

		this._heartbeatTimeout = global.setTimeout(() => {
			this._heartbeatTimeout = null;

			if (this._doKeepOpen) {

				this.writeBuffer(new Buffer([0x00, 0x00, 0x00, 0x00]));
			}
			else {
				this._resetHeartbeatTimeout();
			}
		}, this._sendHeartbeatAfterLastDataInMs);
	}

	public writeBuffer (buffer:NodeBuffer, callback?:Function):boolean {

		var success:boolean = false;

		if (!this._preventWrite && this._socket.writable) {

			try {
				success = this._socket.write(buffer, callback);

				if (success) {
					this._resetHeartbeatTimeout();
				}
			}
			catch (e) {
				this._socket.end();
			}

			buffer = null;
		}

		return success;
	}

	public writeString (message:string, encoding:string = 'utf8', callback?:Function, forceAvoidSimulation?:boolean):boolean {

		var success:boolean = false;

		if (!this._preventWrite && this._socket.writable) {

			try {
				success = this.getSocket().write(message, encoding, callback);
				this._resetHeartbeatTimeout();
			}
			catch (e) {
				this._socket.end();
			}

		}

		return success;
	}

	/**
	 * @deprecated
	 *
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
				this.getSocket().on(evt, () => {
					this.emit.apply(this, [evt].concat(Array.prototype.splice.call(arguments, 0)));
				});
			})(event);
		});
	}

}

export = TCPSocket;