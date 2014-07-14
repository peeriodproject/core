/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ReadableShareAbortMessageInterface = require('./ReadableShareAbortMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface
 */
interface ReadableShareAbortMessageFactoryInterface {

	/**
	 * Creates a readable SHARE_ABORT message from a given buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The buffer to create the message from.
	 * @returns {core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface} The resulting message or `null` on error.
	 */
	create (buffer:Buffer):ReadableShareAbortMessageInterface;

}

export = ReadableShareAbortMessageFactoryInterface;

