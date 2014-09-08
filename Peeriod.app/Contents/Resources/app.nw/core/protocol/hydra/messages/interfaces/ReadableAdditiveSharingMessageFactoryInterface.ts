/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableAdditiveSharingMessageInterface = require('./ReadableAdditiveSharingMessageInterface');

/**
 * @interface
 * @class core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface
 */
interface ReadableAdditiveSharingMessageFactoryInterface {

	/**
	 * Creates a ReadableAdditiveSharingMessage by a buffer.
	 *
	 * @method core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer
	 * @returns core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface
	 */
	create (buffer:Buffer):ReadableAdditiveSharingMessageInterface;
}

export = ReadableAdditiveSharingMessageFactoryInterface;