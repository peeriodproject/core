import ContactNodeInterface = require('../../../../../topology/interfaces/ContactNodeInterface');

/**
 * The NodeSeekerManager can try to 'forcefully get' active nodes. It does so by iterating over a list of NodeSeekers
 * and sends PING to all found nodes. This is reapeated until one node answers.
 *
 * @interface
 * @class core.protocol.nodeDiscovery.NodeSeekerManagerInterface
 *
 */
interface NodeSeekerManagerInterface {

	/**
	 * Iterates over a list of NodeSeekers and sends PINGs to the retrieved nodes.
	 * Calls back with an active node as soon as one answers.
	 *
	 * @param {core.topology.ContactNodeInterface} avoidNode An optional node to avoid. If this is set other than `null`, the function gets
	 * called again if the active node equals the node to avoid.
	 * @param {Function} callback Callback function which gets called with an active node as argument, as soon as one node responds.
	 */
	forceFindActiveNode (avoidNode:ContactNodeInterface, callback:(node:ContactNodeInterface) => any):void;
}

export = NodeSeekerManagerInterface;