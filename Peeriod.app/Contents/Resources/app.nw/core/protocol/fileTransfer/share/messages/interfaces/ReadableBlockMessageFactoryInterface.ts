/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ReadableBlockMessageInterface = require('./ReadableBlockMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface
 */
interface ReadableBlockMessageFactoryInterface {

	/**
	 * Creates a readable BLOCK message from a given buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The buffer to create the message from
	 * @returns {core.protocol.fileTransfer.share.ReadableBlockMessageInterface} The resulting message or `null` on error.
	 */
	create (buffer:Buffer):ReadableBlockMessageInterface;
}

export = ReadableBlockMessageFactoryInterface;