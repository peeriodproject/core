import NodeSeekerList = require('./NodeSeekerList');

/**
 * Creates a list of NodeSeekers.
 *
 * @interface
 * @class core.protocol.nodeDiscovery.NodeSeekerFactoryInterface
 */
interface NodeSeekerFactoryInterface {

	/**
	 * Creates a list of node seekers
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeekerFactoryInterface#createSeekerList
	 *
	 * @param {Function} callback Function that gets called when the seeker list has been created with a NodeSeekerList as argument
	 */
	createSeekerList (callback:(list:NodeSeekerList) => any):void;
}

export = NodeSeekerFactoryInterface;