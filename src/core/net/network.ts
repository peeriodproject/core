/// <reference path='../../../ts-definitions/node/node.d.ts' />

/**
 *
 * @namespace net
 *
 */

/**
 *
 * The network manager class's only objective is to automatically bootstrap the complete network, meaning:
 *
 * - obtaining the external IP of the machine
 * - creating a TCP connection handler
 * - letting the TCP connection handler auto bootstrap all servers
 * - at last calling a callback if successful or not
 *
 */

import net 		= require('net');

export interface NetworkOptions {

	/**
	 * An array of open ports under which the computer can be reached from outside.
	 */
	my_open_ports:Array<number>;
}

export interface NetworkBootstrapperInterface {

}

export class NetworkBootstrapper implements NetworkBootstrapperInterface {

	constructor(opts:NetworkOptions) {

		// @todo we also need some class to obtain the external ip

	}

}

