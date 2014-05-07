import events = require('events');
import net = require('net');

import TCPSocketFactoryInterface = require('./interfaces/TCPSocketFactoryInterface');
import TCPSocketHandlerOptions = require('./interfaces/TCPSocketHandlerOptions');
import TCPSocketHandlerInterface = require('./interfaces/TCPSocketHandlerInterface');
import TCPSocketInterface = require('./interfaces/TCPSocketInterface');
import TCPSocketOptions = require('./interfaces/TCPSocketOptions');

import TCPSocket = require('./TCPSocket');

/**
 * TCPSocketHandler implementation.
 *
 * @class core.net.tcp.TCPSocketHandler
 * @extends events.EventEmitter
 * @implements core.net.tcp.TCPSockerHandlerInterface
 *
 * @param {core.net.tcp.TCPSocketHandlerOptions} opts
 *
 */
class TCPSocketHandler extends events.EventEmitter implements TCPSocketHandlerInterface {

	/**
	 * Flag which indicates whether a FIN packet should generally be sent when the other end of a handled
	 * socket sends a FIN packet.
	 *
	 * @member {boolean} TCPSocketHandler~_allowHalfOpenSockets
	 */
	private _allowHalfOpenSockets:boolean = false;

	/**
	 * Indicates the number of seconds to wait until a server tries to listen on a used port again.
	 * Negative number meas that no retry will be triggered.
	 *
	 * @member {number} TCPSocketHandler~_connectionRetry
	 */
	private _connectionRetry:number = 0;

	/**
	 * For a "regular" connection (i.e. not a connection which serves as a proxy), how many seconds should be waited
	 * after the last activity until the socket connection is killed from this side.
	 *
	 * If idle sockets should not be closed, set to 0 or below.
	 *
	 * @member {number} TCPSocketHandler~_idleConnectionKillTimeout
	 */
	private _idleConnectionKillTimeout:number = 0;

	/**
	 * The external IP address of the computer.
	 *
	 * @member {string} TCPSocketHandler~_myExternalIp
	 */
	private _myExternalIp:string = '';

	/**
	 * An array of open ports under which the computer can be reached from outside.
	 *
	 * @member {number[]} TCPSocketHandler~_myOpenPorts
	 */
	private _myOpenPorts:Array<number> = null;

	/**
	 * A list of listening, from outside reachable servers. Stored under their port numbers.
	 *
	 * @member {Object} TCPSocketHandler~_openTCPServer
	 */
	private _openTCPServers:{[port:string]:net.Socket} = {};

	/**
	 * Number of ms to wait until an outbound socket without emitting `connected` will be considered as unsuccessful.
	 *
	 * @member {number} TCPSocketHandler~_outboundConnectionTimeout
	 */
	private _outboundConnectionTimeout:number = 0;

	/**
	 * An internal list of ports used to memorize which ports have already been retried.
	 *
	 * @member {Array<number>} TCPSocketHandler~_retriedPorts
	 */
	private _retriedPorts:Array<number> = [];

	/**
	 * TCPSocketFactory
	 *
	 * @member TCPSocketHandler~_socketFactory
	 */
	private _socketFactory:TCPSocketFactoryInterface = null;

	constructor (socketFactory:TCPSocketFactoryInterface, opts:TCPSocketHandlerOptions) {
		super();

		if (!net.isIP(opts.myExternalIp)) throw new Error('TCPHandler.constructor: Provided IP is no IP');

		this._socketFactory = socketFactory;

		this.setMyExternalIp(opts.myExternalIp);
		this._myOpenPorts = opts.myOpenPorts || [];
		this._idleConnectionKillTimeout = opts.idleConnectionKillTimeout || 0;
		this._allowHalfOpenSockets = !!opts.allowHalfOpenSockets;
		this._connectionRetry = opts.connectionRetry || 3;
		this._outboundConnectionTimeout = opts.outboundConnectionTimeout || 2;
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
		var connectionError = () => {
			sock.removeAllListeners();
			sock.destroy();

			if (callback) {
				callback(null)
			}
			else {
				this.emit('connection error', port, ip);
			}
		};
		var connectionTimeout = setTimeout(function () {
			connectionError();
		}, this._outboundConnectionTimeout);

		sock.on('error', connectionError);

		sock.on('connect', () => {
			clearTimeout(connectionTimeout);
			sock.removeAllListeners('error');
			var socket = this._socketFactory.create(sock, this.getDefaultSocketOptions());

			if (!callback) {
				this.emit('connected', socket, 'outgoing');
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
						var socket = this._socketFactory.create(sock, this.getDefaultSocketOptions());
						this.emit('connected', socket, 'incoming');
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
