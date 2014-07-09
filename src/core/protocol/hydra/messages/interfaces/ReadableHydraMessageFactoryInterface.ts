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
	 * @oaram {boolean} noCircuitIdExtranction Optional. If this is true, the circuit ID is not extracted, no matter what type of message.
	 * @returns core.protocol.hydra.ReadableHydraMessageInterface
	 */
	create (buffer:Buffer, noCircuitIdExtraction?:boolean):ReadableHydraMessageInterface;
}

export = ReadableHydraMessageFactoryInterface;