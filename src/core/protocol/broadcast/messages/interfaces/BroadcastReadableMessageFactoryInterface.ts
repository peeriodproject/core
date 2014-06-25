/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import BroadcastReadableMessageInterface = require('./BroadcastReadableMessageInterface');

/**
 * @interface
 * @class core.protocol.broadcast.BroadcastReadableMessageFactoryInterface
 */
interface BroadcastReadableMessageFactoryInterface {

	/**
	 * Creates a BroadcastReadableMessage from a given buffer.
	 *
	 * @method core.protocol.broadcast.BroadcastReadableMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer Buffer to create the readable message from.
	 */
	create (buffer:Buffer):BroadcastReadableMessageInterface;
}

export = BroadcastReadableMessageFactoryInterface;