/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableFileTransferMessageInterface = require('./ReadableFileTransferMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface
 */
interface ReadableFileTransferMessageFactoryInterface {

	/**
	 * Creates a ReadableFileTransferMessage from the given buffer.
	 *
	 * @method core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The byte buffer to create the message from
	 * @returns {core.protocol.fileTransfer.ReadableFileTransferMessageInterface}
	 */
	create (buffer:Buffer):ReadableFileTransferMessageInterface;
}

export = ReadableFileTransferMessageFactoryInterface;