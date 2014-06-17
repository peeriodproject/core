/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import LayeredEncDecHandlerInterface = require('./LayeredEncDecHandlerInterface');
import HydraNode = require('../../interfaces/HydraNode');

/**
 * @interface
 * @class core.protocol.hydra.messages.LayeredEncDecHandlerFactoryInterface
 */
interface LayeredEncDecHandlerFactoryInterface {

	/**
	 * Creates a layered encryption/decryption handler
	 *
	 * @method core.protocol.hydra.LayeredEncDecHandlerFactoryInterface#create
	 *
	 * @param {core.protocol.hydra.HydraNode} initialNode Optional. The first node in the chain.
	 * @returns {core.protocol.hydra.LayeredEncDecHandlerInterface}
	 */
	create (initialNode?:HydraNode):LayeredEncDecHandlerInterface;
}

export = LayeredEncDecHandlerFactoryInterface;