/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import net 			= require('net');
import events 		= require('events');
import tcp_socket	= require('./tcp_socket');

var TCPSocket		= tcp_socket.TCPSocket;

/**
 * @namespace net/tcp
 *
 *
 * The class TCPSocketHandler provides a wrapper around node.js's functionality to create TCP servers and clients,
 * automatically handling some stuff (like listening retry).
 *
 * It has the functionality to 'auto bootstrap' with open ports which means it creates TCP servers listening on those ports
 * and checking if they can be reached from outside, at the end emitting a `bootstrapped`.
 *
 * The aim of TCPSocketHandler is making it obsolete if a connections was established as a server or client on the local end.
 * What matters is the sockets.
 * Thus it emits the event `connected` with a TCPSocket instance.
 * It also emits an `opened server` and `closed server` event (with net.Server instance) on the opening or closing of
 * a TCP server.
 *
 */

export interface TCPSocketHandlerOptions {

	/**
	 * The external IP address of the computer.
	 */
	my_external_ip:string;

	/**
	 * An array of open ports under which the computer can be reached from outside.
	 */
	my_open_ports?:Array<number>;

	/**
	 * For a "regular" connection (i.e. not a connection which serves as a proxy), how many seconds should be waited
	 * after the last activity until the socket connection is killed from this side.
	 *
	 * If idle sockets should not be closed, set to 0 or below.
	 *
	 */
	idle_connection_kill_timeout:number;

	/**
	 * Indicates whether a socket should not send a FIN packet when the other side sends a FIN packet
	 * (thus being 'half-open')
	 *
	 * Defaults to false.
	 */
	allow_half_open_sockets?:boolean;

	/**
	 * Indicates the number of seconds to wait until a server tries to listen on a used port again.
	 *
	 * Default is 3. If no retry should be triggered, provide a negative number.
	 *
	 */
	connection_retry?:number;
}

export interface TCPSocketHandlerInterface {

	/**
	 * Sets the IP under which TCP servers should be reachable from outside.
	 *
	 * @param ip
	 */
	setMyExternalIp(ip:string):void;

	/**
	 * Uses the provided open ports to listen on them with TCP servers. When all servers have been set up (or a timeout
	 * has expired, when something takes too long), a callback is called with an array of the port being listened on.
	 *
	 * @param callback
	 */
	autoBootstrap(callback: (openPorts:Array<number>) => any):void;

	/**
	 * Create a TCP connection to the specified PORT, IP pair.
	 * On success, a 'connected' event will be emitted with the TCPSocket instance as argument, if no callback is specified.
	 *
	 * If a callback is supplied, it will be called with the TCPSocket instance as argument.
	 *
	 * @param port
	 * @param ip
	 */
	connectTo(port:number, ip:string, callback?:(socket:tcp_socket.TCPSocket) => any):void;

	/**
	 * Creates a TCP server with the specified option of allowing half open sockets.
	 */
	createTCPServer():net.Server;

	/**
	 * Creates a TCP server, lets it listen on the specified port, handles retry on a EADDRINUSE error,
	 * and binds events to connected sockets and the opening/closing of the server
	 *
	 * @param port
	 */
	createTCPServerAndBootstrap(port:number):net.Server;

	/**
	 * Returns the default options for all TCP sockets, getting seeded by options specified in the TCPSocketHandler
	 * constructor.
	 */
	defaultSocketOptions():tcp_socket.TCPSocketOptions;
}

export class TCPSocketHandler extends events.EventEmitter implements TCPSocketHandlerInterface {

	private my_external_ip:string 					= '';
	private my_open_ports:Array<number> 			= null;
	private idle_connection_kill_timeout:number 	= 0;
	private allow_half_open_sockets:boolean			= false;
	private connection_retry:number					= 0;

	private openTCPServers:Object					= {};
	private retriedPorts:Array<number>				= [];

	constructor(opts:TCPSocketHandlerOptions) {
		super();

		if (!net.isIP(opts.my_external_ip)) throw new Error('TCPHandler: Provided IP is no IP');

		this.setMyExternalIp(opts.my_external_ip);
		this.my_open_ports 							= opts.my_open_ports || [];
		this.idle_connection_kill_timeout		 	= opts.idle_connection_kill_timeout || 0;
		this.allow_half_open_sockets 				= !!opts.allow_half_open_sockets;
		this.connection_retry 						= opts.connection_retry || 3;
	}

	public setMyExternalIp(ip:string):void {
		this.my_external_ip = ip;
	}

	public autoBootstrap(callback: (openPorts:Array<number>) => any):void {
		var doCallback = true,
			callbackTimeout = null,
			checkAndCallback = (port:number, server:net.Server) => {
				if (callbackTimeout) clearTimeout(callbackTimeout);

				if (Object.keys(this.openTCPServers).length === this.my_open_ports.length) {
					theCallback();
				} else {
					setCallbackTimeout();
				}
			},
			setCallbackTimeout = () => {
				callbackTimeout = setTimeout(() => {
					theCallback();
				}, 5000);
			},
			theCallback = () => {
				if (doCallback) {
					callback(this.getOpenServerPortsArray());
					this.removeListener('opened server', checkAndCallback);
				}
				doCallback = false;
			}

		this.my_open_ports.forEach((port) => {
			this.createTCPServerAndBootstrap(port);
		});

		this.on('opened server', checkAndCallback);

		setCallbackTimeout();
	}

	public connectTo(port:number, ip:string, callback?:(socket:tcp_socket.TCPSocket) => any):void {
		var sock = net.createConnection(port, ip);

		sock.on('error', function () {
			this.emit('connection error', port, ip);
		});

		sock.on('connect', () => {
			sock.removeAllListeners('error');
			var socket = new TCPSocket(sock, this.defaultSocketOptions());

			if (!callback) {
				this.emit('connected', socket);
			} else {
				callback(socket);
			}

		});
	}

	public createTCPServer():net.Server {
		return net.createServer({
			allowHalfOpen: this.allow_half_open_sockets
		});
	}

	public createTCPServerAndBootstrap(port:any):net.Server {
		if (typeof port !== 'number') port = parseInt(port, 10);

		var server = this.createTCPServer();

		// retry once when encountering EADDRINUSE
		server.on('error', (error) => {
			if (error.code == 'EADDRINUSE') {
				// retry
				if (this.connection_retry >= 0 && this.retriedPorts.indexOf(port) < 0) {
					this.retriedPorts.push(port);
					setTimeout(function () {
						server.listen(port);
					}, this.connection_retry * 1000);
				}
			}
		});

		// put it in our open server list, if reachable from outside
		server.on('listening', () => {
			this.checkIfServerIsReachableFromOutside(server, (success) => {
				if (success) {
					var port = server.address().port;
					this.openTCPServers[port] = server;

					server.on('connection', (sock:net.Socket) => {
						var socket = new TCPSocket(sock, this.defaultSocketOptions());
						this.emit('connected', socket);
					});

					this.emit('opened server', port, server);
				} else {
					server.close();
				}
			});
		});

		// remove it from our open server list
		server.on('close', () => {
			delete this.openTCPServers[server.address().port];
			this.emit('closed server', port);
		});

		server.listen(port);

		return server;
	}

	public checkIfServerIsReachableFromOutside(server:net.Server, callback:(success:boolean) => any):void {
		var connectionTimeout = null,
			serverOnConnect = function (sock:net.Socket) {
				sock.on('data', function (data) {
					sock.write(data);
				});
			},
			callbackWith = function (success:boolean, socket?:tcp_socket.TCPSocket) {
				callback(success);
				if (socket) socket.end();
				server.removeListener('connection', serverOnConnect);
			}

		server.on('connection', serverOnConnect);

		connectionTimeout = setTimeout(function () {
			callbackWith(false);
			server.close();
		}, 2000);

		this.connectTo(server.address().port, this.my_external_ip, function (socket) {
			socket.writeBuffer(new Buffer([20]));
			socket.on('data', function (data) {
				clearTimeout(connectionTimeout);
				if (data[0] === 20) {
					callbackWith(true);
				}
			});
		});
	}

	public defaultSocketOptions():tcp_socket.TCPSocketOptions {
		return <tcp_socket.TCPSocketOptions> {
			idle_connection_kill_timeout: this.idle_connection_kill_timeout,
			do_keep_alive: true
		};
	}

	public getOpenServerPortsArray():Array<number> {
		return Object.keys(this.openTCPServers).map(function (port) {
			return parseInt(port, 10);
		});
	}


}
