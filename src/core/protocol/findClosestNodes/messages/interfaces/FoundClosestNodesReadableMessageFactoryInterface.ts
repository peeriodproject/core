/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import FoundClosestNodesReadableMessageInterface = require('./FoundClosestNodesReadableMessageInterface');

/**
 * @interface
 * @class core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactoryInterface
 */
interface FoundClosestNodesReadableMessageFactoryInterface {

	/**
	 * @method core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactoryInterface#create
	 *
	 * @param {Buffer} payload
	 * @returns core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface
	 */
	create (payload:Buffer):FoundClosestNodesReadableMessageInterface;
}

export = FoundClosestNodesReadableMessageFactoryInterface;