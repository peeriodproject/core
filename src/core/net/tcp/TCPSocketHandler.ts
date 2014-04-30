import net = require('net');
import events = require('events');

import TCPSocketHandlerOptions = require('./interfaces/TCPSocketHandlerOptions');
import TCPSocketHandlerInterface = require('./interfaces/TCPSocketHandlerInterface');
import TCPSocketOptions = require('./interfaces/TCPSocketOptions');
import TCPSocketInterface = require('./interfaces/TCPSocketInterface');
import TCPSocket = require('./TCPSocket');

/**
 * TCPSocketHandler implementation.
 *
 * @class core.net.tcp.TCPSocketHandler
 * @extends events.EventEmitter
 * @implements TCPSockerHandlerInterface
 *
 * @param {core.net.tcp.TCPSocketHandlerOptions} opts
 *
 */
class TCPSocketHandler extends events.EventEmitter implements TCPSocketHandlerInterface {

	/**
	 * Flag which indicates whether a FIN packet should generally be sent when the other end of a handled
	 * socket sends a FIN packet.
	 *
	 * @private
	 * @member {boolean} TCPSocketHandler~_allowHalfOpenSockets
	 */
	private _allowHalfOpenSockets:boolean = false;

	/**
	 * Indicates the number of seconds to wait until a server tries to listen on a used port again.
	 * Negative number meas that no retry will be triggered.
	 *
	 * @private
	 * @member {number} TCPSocketHandler~_connectionRetry
	 */
	private _connectionRetry:number = 0;

	/**
	 * For a "regular" connection (i.e. not a connection which serves as a proxy), how many seconds should be waited
	 * after the last activity until the socket connection is killed from this side.
	 *
	 * If idle sockets should not be closed, set to 0 or below.
	 *
	 * @private
	 * @member {number} TCPSocketHandler~_idleConnectionKillTimeout
	 */
	private _idleConnectionKillTimeout:number = 0;

	/**
	 * The external IP address of the computer.
	 *
	 * @private
	 * @member {string} TCPSocketHandler~_myExternalIp
	 */
	private _myExternalIp:string = '';

	/**
	 * An array of open ports under which the computer can be reached from outside.
	 *
	 * @private
	 * @member {number[]} TCPSocketHandler~_myOpenPorts
	 */
	private _myOpenPorts:Array<number> = null;

	/**
	 * A list of listening, from outside reachable servers. Stored under their port numbers.
	 *
	 * @private
	 * @member {Object} TCPSocketHandler~_openTCPServer
	 */
	private _openTCPServers:{[port:string]:net.Socket} = {};

	/**
	 * An internal list of ports used to memorize which ports have already been retried.
	 *
	 * @private
	 * @member {Array<number>} TCPSocketHandler~_retriedPorts
	 */
	private _retriedPorts:Array<number> = [];

	constructor (opts:TCPSocketHandlerOptions) {
		super();

		if (!net.isIP(opts.myExternalIp)) throw new Error('TCPHandler.constructor: Provided IP is no IP');

		this.setMyExternalIp(opts.myExternalIp);
		this._myOpenPorts = opts.myOpenPorts || [];
		this._idleConnectionKillTimeout = opts.idleConnectionKillTimeout || 0;
		this._allowHalfOpenSockets = !!opts.allowHalfOpenSockets;
		this._connectionRetry = opts.connectionRetry || 3;
	}

	public autoBootstrap (callback:(openPorts:Array<number>) => any):void {
		var doCallback:boolean = true;
		var callbackTimeout:number = 0;
		var checkAndCallback:Function = (port:number, server:net.Server) => {
				if (callbackTimeout) {
					clearTimeout(callbackTimeout);
				}

				if (Object.keys(this._openTCPServers).length === this._myOpenPorts.length) {
					theCallback();
				}
				else {
					setCallbackTimeout();
				}
			};
		var setCallbackTimeout:Function = () => {
				callbackTimeout = setTimeout(() => {
					theCallback();
				}, 5000);
			};
		var theCallback:Function = () => {
				if (doCallback) {
					callback(this.getOpenServerPortsArray());
					this.removeListener('openedReachableServer', checkAndCallback);
				}
				doCallback = false;
			}

		this._myOpenPorts.forEach((port) => {
			this.createTCPServerAndBootstrap(port);
		});

		this.on('openedReachableServer', checkAndCallback);

		setCallbackTimeout();
	}

	public connectTo (port:number, ip:string, callback?:(socket:TCPSocketInterface) => any):void {
		var sock:net.Socket = net.createConnection(port, ip);

		sock.on('error', function () {
			this.emit('connection error', port, ip);
		});

		sock.on('connect', () => {
			sock.removeAllListeners('error');

			var socket = new TCPSocket(sock, this.getDefaultSocketOptions());

			if (!callback) {
				this.emit('connected', socket);
			}
			else {
				callback(socket);
			}

		});
	}

	public createTCPServer ():net.Server {
		return net.createServer({
			allowHalfOpen: this._allowHalfOpenSockets
		});
	}

	public createTCPServerAndBootstrap (port:any):net.Server {
		var server:net.Server = this.createTCPServer();

		if (typeof port !== 'number') {
			port = parseInt(port, 10);
		}

		// retry once when encountering EADDRINUSE
		server.on('error', (error) => {
			if (error.code == 'EADDRINUSE') {

				// retry
				if (this._connectionRetry >= 0 && this._retriedPorts.indexOf(port) < 0) {
					this._retriedPorts.push(port);

					setTimeout(function () {
						server.listen(port);
					}, this._connectionRetry * 1000);
				}
			}
		});

		// put it in our open server list, if reachable from outside
		server.on('listening', () => {
			var port = server.address().port;

			this.checkIfServerIsReachableFromOutside(server, (success) => {
				if (success) {
					this._openTCPServers[port] = server;

					server.on('connection', (sock:net.Socket) => {
						var socket = new TCPSocket(sock, this.getDefaultSocketOptions());
						this.emit('connected', socket);
					});

					this.emit('openedReachableServer', port, server);
				}
				else {
					server.close();
				}
			});

			// remove it from our open server list
			server.on('close', () => {
				delete this._openTCPServers[port];
				this.emit('closedServer', port);
			});
		});

		server.listen(port);

		return server;
	}

	/**
	 * Takes a server and checks if it can be reached from outside the network with the external IP specified in
	 * the constructor. Calls a callback with a flag indicating if it was successful (true) or not (false).
	 * It does not, however, automatically close the server if it is not reachable.
	 *
	 * @method TCPSocketHandler#checkIfServerIsReachableFromOutside
	 *
	 * @param {net.Server} server Server to check
	 * @param {Function} callback Callback which gets called with a success flag. `True` if reachable, `false`if unreachable
	 */
	public checkIfServerIsReachableFromOutside (server:net.Server, callback:(success:boolean) => any):void {
		var connectionTimeout = null;
		var serverOnConnect = function (sock:net.Socket) {
				sock.on('data', function (data) {
					sock.write(data);
				});
			};
		var callbackWith = function (success:boolean, socket?:TCPSocketInterface) {
				callback(success);
				if (socket) {
					socket.end();
				}
				server.removeListener('connection', serverOnConnect);
			};

		server.on('connection', serverOnConnect);

		connectionTimeout = setTimeout(function () {
			callbackWith(false);
		}, 2000);

		this.connectTo(server.address().port, this._myExternalIp, function (socket) {
			socket.writeBuffer(new Buffer([20]));
			socket.on('data', function (data) {
				clearTimeout(connectionTimeout);
				if (data[0] === 20) {
					callbackWith(true, socket);
				}
			});
		});
	}

	public getDefaultSocketOptions ():TCPSocketOptions {
		return <TCPSocketOptions> {
			idleConnectionKillTimeout	: this._idleConnectionKillTimeout,
			doKeepAlive					: true
		};
	}

	/**
	 * Returns an array of open TCP server ports which are reachable from outside.
	 *
	 * @method TCPSocketHandler#getOpenServerPortsArray
	 *
	 * @returns {number[]} Array of open server ports
	 */
	public getOpenServerPortsArray ():Array<number> {
		return Object.keys(this._openTCPServers).map(function (port) {
			return parseInt(port, 10);
		});
	}

	public setMyExternalIp (ip:string):void {
		this._myExternalIp = ip;
	}


}

export = TCPSocketHandler;
