/// <reference path='../../../ts-definitions/node/node.d.ts' />

/**
 *
 * @namespace net
 *
 */

import net 		= require('net');
import events 	= require('events');

export interface NetworkOptions {

	/**
	 * An array of open ports under which the computer can be reached from outside.
	 */
	my_open_ports:Array<number>;
}

export interface NetworkManagerInterface {

}

export class NetworkManager extends events.EventEmitter implements NetworkManagerInterface {

	constructor(opts:NetworkOptions) {
		super();

		// @todo check if the ports are really open, maybe a PortChecker class?
		// @todo create a TCPHandler
		// @todo we also need some class to obtain the external ip

	}

}

