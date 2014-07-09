/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableCellCreatedRejectedMessageInterface = require('./ReadableCellCreatedRejectedMessageInterface');

/**
 * @interface
 * @class core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface
 */
interface ReadableCellCreatedRejectedMessageFactoryInterface {

	/**
	 * Creates a ReadableCellCreatedRejectedMessage by a buffer
	 *
	 * @method core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer
	 * @returns {core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface}
	 */
	create (buffer:Buffer):ReadableCellCreatedRejectedMessageInterface;
}

export = ReadableCellCreatedRejectedMessageFactoryInterface;