/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraCircuitInterface = require('./HydraCircuitInterface');

/**
 * @interface
 * @class core.protocol.hydra.HydraCircuitFactoryInterface
 */
interface HydraCircuitFactoryInterface {

	/**
	 * Creates a hydra circuit instance.
	 *
	 * @param {number} numOfRelayNodes The desired number of relay nodes this circuit should strive for.
	 * @returns {core.protocol.hydra.HydraCircuitInterface} The resulting circuit.
	 */
	create (numOfRelayNodes:number):HydraCircuitInterface;
}

export = HydraCircuitFactoryInterface;