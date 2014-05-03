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
	bootstrap (callback:(err:Error) => any):void;
	getTCPSocketHandler ():TCPSocketHandlerInterface;
}

export = NetworkBootstrapperInterface;