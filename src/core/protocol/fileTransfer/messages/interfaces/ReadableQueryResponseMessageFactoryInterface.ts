/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableQueryResponseMessageInterface = require('./ReadableQueryResponseMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface
 */
interface ReadableQueryResponseMessageFactoryInterface {

	/**
	 * Creates a readable QUERY_RESPONSE message from the given FILE_TRANSFER payload.
	 *
	 * @method core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The byte buffer to create the readable message from.
	 * @returns {core.protocol.fileTransfer.ReadableQueryResponseMessageInterface}
	 */
	create (buffer:Buffer):ReadableQueryResponseMessageInterface;
}

export = ReadableQueryResponseMessageFactoryInterface;