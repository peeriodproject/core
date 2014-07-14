/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ReadableShareRequestMessageInterface = require('./ReadableShareRequestMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface
 */
interface ReadableShareRequestMessageFactoryInterface {

	/**
	 * Creates a readable SHARE_REQUEST message from a given buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The buffer to create the message f
	 * @returns {core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface} The resulting message or `null` on error.
	 */
	create (buffer:Buffer):ReadableShareRequestMessageInterface;
}

export = ReadableShareRequestMessageFactoryInterface;