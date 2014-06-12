/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableHydraMessageInterface = require('./ReadableHydraMessageInterface');

/**
 * @interface
 * @class core.protocol.hydra.ReadableHydraMessageFactoryInterface
 */
interface ReadableHydraMessageFactoryInterface {

	/**
	 * Creates a ReadableHydraMessage by a Buffer
	 *
	 * @method core.protocol.hydra.ReadableHydraMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer Buffer to create the message from
	 * @returns core.protocol.hydra.ReadableHydraMessageInterface
	 */
	create (buffer:Buffer):ReadableHydraMessageInterface;
}

export = ReadableHydraMessageFactoryInterface;