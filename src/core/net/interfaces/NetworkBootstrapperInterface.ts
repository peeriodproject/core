/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import TCPSocketHandlerInterface = require('../tcp/interfaces/TCPSocketHandlerInterface');

/**
 * The network bootstrapper class's only objective is to automatically bootstrap the complete network, meaning:
 *
 * - obtaining the external IP of the machine
 * - creating a TCP connection handler
 * - letting the TCP connection handler auto bootstrap all servers
 * - at last calling a callback if successful or not
 *
 */

interface NetworkBootstrapperInterface {
	/**
	 * Bootstraps the network and calls a callback when it's done. Creates a TCP connection handler, lets it
	 * auto bootstrap the open ports and obtains the machine's external ip.
	 *
	 * @param {Function} callback
	 */
	bootstrap (callback:(err:Error) => any):void;

	/**
	 * Gets the TCPSocketHandler which was created on `bootstrap`
	 *
	 * @returns core.net.tcp.TCPSocketHandlerInterface
	 */
	getTCPSocketHandler ():TCPSocketHandlerInterface;
}

export = NetworkBootstrapperInterface;