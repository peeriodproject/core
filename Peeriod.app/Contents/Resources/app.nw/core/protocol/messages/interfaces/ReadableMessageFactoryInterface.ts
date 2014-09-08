/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import ReadableMessageInterface = require('./ReadableMessageInterface');

/**
 * @interface
 * @class core.protocol.messages.ReadableMessageFactoryInterface
 */
interface ReadableMessageFactoryInterface {

	/**
	 * Creates an instance of a class implementing ReadableMessageInterface
	 *
	 * @param {Buffer} buffer A byte buffer.
	 */
	create (buffer:Buffer):ReadableMessageInterface;

}

export = ReadableMessageFactoryInterface;