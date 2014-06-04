import events = require('events');
import net = require('net');

import TCPSocketInterface = require('./interfaces/TCPSocketInterface');
import TCPSocketOptions = require('./interfaces/TCPSocketOptions');

var logger = require('../../utils/logger/LoggerFactory').create();
var stackTrace = require('stack-trace');

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
	 * @member {boolean} core.net.tcp.TCPSocket~_closeOnTimeout
	 */
	private _closeOnTimeout:boolean = false;

	/**
	 * The options passed in the constructor (for reference)
	 *
	 * @member {core.net.TCPSocketOptions} core.net.tcp.TCPSocket~_constructorOpts
	 */
	private _constructorOpts:TCPSocketOptions = null;

	/**
	 * List of event names of net.Socket which will be simply propagated on emission
	 *
	 * @member {string[]} core.net.tcp.TCPSocket~_eventsToPropagate
	 */
	private _eventsToPropagate:Array<string> = ['data', 'close', 'end', 'error'];

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

	private _uuid:string = '';


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

		this._simulatorRTT = opts.simulatorRTT || 0;

		// set the timeout
		if (opts.idleConnectionKillTimeout > 0) {
			this._closeOnTimeout = true;
			this.getSocket().setTimeout(opts.idleConnectionKillTimeout * 1000);
		}

		this.setupListeners();

		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}

		this._uuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

		logger.info('added socket');
	}

	public end (data?:any, encoding?:string):void {

		if (this.getSocket() && !this._preventWrite) {
			this._preventWrite = true;
			logger.info('socket ending...', {ident: this.getIdentifier()});
			this.getSocket().end(data, encoding);

		}
	}

	public forceDestroy():void {
		/*if (this._socket) {
			logger.info('destroying socket');

			this._closeOnTimeout = false;

			try {
				//this.getSocket().removeAllListeners();
				this.getSocket().end();
				this.getSocket().destroy();
			}
			catch (e) {}
			this._socket = null;
			this.emit('destroy');
			this.removeAllListeners();
		}*/
		logger.error('Force destroy is deprecated.');
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
			logger.info('timing out socket', {ident: this.getIdentifier(), sockid: this._uuid});
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

		socket.on('error', (err) => {
			//var trace = stackTrace.parse(err);
			logger.error('THIS IS A SOCKET ERROR!', {
				emsg: err.message,
				stack:err.stack,
				/*trace: {
					typeName: trace.getTypeName(),
					fnName  : trace.getFunctionName(),
					fileName: trace.getFileName(),
					line    : trace.getLineNumber()
				},*/
				ident: this.getIdentifier(),
				sockid: this._uuid
			});

			if (!this._preventWrite) {
				logger.info('preventing write', {ident: this.getIdentifier(), sockid: this._uuid});
			}
			this._preventWrite = true;

			try {
				socket.destroy();
			}
			catch (e) {}
		});

		socket.on('close', (had_error:boolean) => {
			if (!this._preventWrite) {
				logger.info('preventing write', {ident: this.getIdentifier(), sockid: this._uuid});
			}
			this._preventWrite = true;
			this._socket = null;

			logger.info('socket closed', {ident: this.getIdentifier(), had_error:had_error, sockid: this._uuid});

			this.emit('destroy');

			process.nextTick(() => {
				this.removeAllListeners();
			});
		});

		socket.on('end', () => {
			if (!this._preventWrite) {
				logger.info('preventing write', {ident: this.getIdentifier(), sockid: this._uuid});
			}
			this._preventWrite = true;
		});

		this._propagateEvents(this._eventsToPropagate);
	}

	public writeBuffer (buffer:NodeBuffer, callback?:Function, forceAvoidSimulation?:boolean):boolean {

		if (this._simulatorRTT && !forceAvoidSimulation) {
			global.setTimeout(() => {
				this.writeBuffer(buffer, callback, true);
			}, this._simulatorRTT);
			return;
		}

		process.nextTick(() => {
			var success:boolean = false;

			if (!this._preventWrite) {

				try {
					success = this.getSocket().write(buffer, callback);
				}
				catch (e) {}

				buffer = null;

			}
		});



		return true;
	}

	public writeString (message:string, encoding:string = 'utf8', callback?:Function, forceAvoidSimulation?:boolean):boolean {

		if (this._preventWrite) return;

		if (this._simulatorRTT && !forceAvoidSimulation) {
			global.setTimeout(() => {
				this.writeString(message, encoding, callback, true);
			}, this._simulatorRTT);
			return;
		}

		var success:boolean = false;

		try {
			success = this.getSocket().write(message, encoding, callback);
		}
		catch (e) {}

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
				this.getSocket().on(evt, () => {
					this.emit.apply(this, [evt].concat(Array.prototype.splice.call(arguments, 0)));
				});
			})(event);
		});
	}

}

export = TCPSocket;