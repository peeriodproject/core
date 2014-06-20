/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import CircuitExtenderInterface = require('./CircuitExtenderInterface');
import LayeredEncDecHandlerInterface = require('../messages/interfaces/LayeredEncDecHandlerInterface');

/**
 * @interface
 * @class core.protocol.hydra.CircuitExtenderFactoryInterface
 */
interface CircuitExtenderFactoryInterface {

	/**
	 * Creates a circuit extender.
	 * For more information, see {@link core.protocol.hydra.CircuitExtenderInterface}
	 *
	 * @param {number} reactionTimeInMs
	 * @param {number}reactionTimeFactor
	 * @param {core.protocol.hydra.LayeredEncDecHandlerInterface} encDecHandler
	 * @returns {core.protocol.hydra.CircuitExtenderInterface}
	 */
	create (reactionTimeInMs:number, reactionTimeFactor:number, encDecHandler:LayeredEncDecHandlerInterface):CircuitExtenderInterface;
}

export = CircuitExtenderFactoryInterface;