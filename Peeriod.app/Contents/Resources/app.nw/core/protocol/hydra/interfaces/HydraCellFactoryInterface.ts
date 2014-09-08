/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraCellInterface = require('./HydraCellInterface');
import HydraNode = require('./HydraNode');

/**
 * Creates a {@link core.protocol.hydra.HydraCellInterface} by a given predecessorNode
 *
 * @interface
 * @class core.protocol.hydra.HydraCellFactoryInterface
 */
interface HydraCellFactoryInterface {

	/**
	 * Creates a HydraCellInterface by a given predecessorNode.
	 * The predecessorNode MUST have a circuitId and MUST be assigned to a socketIdentifier.
	 *
	 * @param {core.protocol.hydra.HydraNode} predecessorNode
	 * @returns {core.protocol.hydra.HydraCellInterface}
	 */
	create (predecessorNode:HydraNode):HydraCellInterface;
}

export = HydraCellFactoryInterface;