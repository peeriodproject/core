/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ReadableShareRatifyMessageInterface = require('./ReadableShareRatifyMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface
 */
interface ReadableShareRatifyMessageFactoryInterface {

	/**
	 * Creates a readable SHARE_RATIFY message from a given buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The buffer to create the message from
	 * @returns {core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface} The resulting message or `null` on error.
	 */
	create (buffer:Buffer):ReadableShareRatifyMessageInterface;
}

export = ReadableShareRatifyMessageFactoryInterface;