/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableCreateCellAdditiveMessageInterface = require('./ReadableCreateCellAdditiveMessageInterface');

/**
 * @interface
 * @class core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface
 */
interface ReadableCreateCellAdditiveMessageFactoryInterface {

	/**
	 * Creates a ReadableCreateCellAdditiveMessage by a buffer.
	 *
	 * @method core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer
	 * @returns {core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface}
	 */
	create (buffer:Buffer):ReadableCreateCellAdditiveMessageInterface;
}

export = ReadableCreateCellAdditiveMessageFactoryInterface;