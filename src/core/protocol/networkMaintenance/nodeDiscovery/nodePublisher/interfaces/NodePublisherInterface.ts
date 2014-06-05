/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import MyNodeInterface = require('../../../../../topology/interfaces/MyNodeInterface');

/**
 * The NodePublisher's only objective is to publish the contact information about MyNode to some source where other nodes
 * can request this information from.
 *
 * @interface
 * @class core.protocol.nodeDiscovery.NodePublisherInterface
 */
interface NodePublisherInterface {

	/**
	 * Publishes my node to some source.
	 *
	 * @method core.protocol.nodeDiscovery.NodePublisherInteface#publish
	 *
	 * @param {core.topology.MyNodeInterface} myNode
	 */
	publish (myNode:MyNodeInterface):void;
}

export = NodePublisherInterface;
