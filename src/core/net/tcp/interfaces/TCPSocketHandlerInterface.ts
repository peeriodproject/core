/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

import TCPSocketInterface = require('./TCPSocketInterface');
import TCPSocketOptions = require('./TCPSocketOptions');

/**
 * The class TCPSocketHandler provides a wrapper around node.js's functionality to create TCP servers and clients,
 * automatically handling some stuff (like listening retry).
 *
 * It has the functionality to 'auto bootstrap' with open ports which means it creates TCP servers listening on those ports
 * and checking if they can be reached from outside, at the end emitting a `bootstrapped`.
 *
 * The aim of TCPSocketHandler is making it obsolete if a connection was established as a server or client on the local end.
 * What matters is the sockets.
 * Thus it emits the event `connected` with a TCPSocket instance.
 * It also emits an `opened server` and `closed server` event (with net.Server instance) on the opening or closing of
 * a TCP server.
 *
 * @interface
 * @class core.net.tcp.TCPSocketHandlerInterface
 */
interface TCPSocketHandlerInterface {

	/**
	 * Uses the provided open ports to listen on them with TCP servers. When all servers have been set up (or a timeout
	 * has expired, when something takes too long), a callback is called with an array of the ports being listened on.
	 *
	 * @method core.net.tp.TCPSocketHandlerInterface#autoBootstrap
	 *
	 * @param {Function} callback
	 */
	autoBootstrap (callback:(openPorts:Array<number>) => any):void;

	/**
	 * Create a TCP connection to the specified PORT, IP pair.
	 * On success, a 'connected' event will be emitted with the TCPSocket instance as argument, if no callback is specified.
	 *
	 * If a callback is supplied, it will be called with the TCPSocket instance as argument.
	 *
	 * @method core.net.tp.TCPSocketHandlerInterface#connectTo
	 *
	 * @param {number} port
	 * @param {string} ip
	 * @param {Function} callback Optional. Gets called with the resulting socket as parameter.
	 */
	connectTo (port:number, ip:string, callback?:(socket:TCPSocketInterface) => any):void;

	/**
	 * Creates a TCP server with the specified option of allowing half open sockets.
	 *
	 * @method core.net.tp.TCPSocketHandlerInterface#createTCPServer
	 *
	 * @returns {net.Server}
	 */
	createTCPServer ():net.Server;

	/**
	 * Creates a TCP server, lets it listen on the specified port, handles retry on a EADDRINUSE error,
	 * and binds events to connected sockets and the opening/closing of the server
	 *
	 * @method core.net.tp.TCPSocketHandlerInterface#createTCPServerAndBootstrap
	 *
	 * @param port
	 * @returns {net.Server}
	 */
	createTCPServerAndBootstrap (port:number):net.Server;

	/**
	 * Returns the default options for all TCP sockets, getting seeded by options specified in the TCPSocketHandler
	 * constructor.
	 *
	 * @method core.net.tp.TCPSocketHandlerInterface#defaultSocketOptions
	 *
	 * @returns {TCPSocketOptions}
	 */
	getDefaultSocketOptions ():TCPSocketOptions;

	/**
	 * Sets the IP under which TCP servers should be reachable from outside.
	 *
	 * @method core.net.tp.TCPSocketHandlerInterface#setMyExternalIp
	 *
	 * @param {string} ip
	 */
	setMyExternalIp (ip:string):void;
}

export = TCPSocketHandlerInterface;