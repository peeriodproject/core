/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ReadableBlockRequestMessageInterface = require('./ReadableBlockRequestMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface
 */
interface ReadableBlockRequestMessageFactoryInterface {

	/**
	 * Creates a readable BLOCK_REQUEST message from a given buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The buffer to create the message from
	 * @returns {core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface} The resulting message or `null` on error.
	 */
	create (buffer:Buffer):ReadableBlockRequestMessageInterface;
}

export = ReadableBlockRequestMessageFactoryInterface;