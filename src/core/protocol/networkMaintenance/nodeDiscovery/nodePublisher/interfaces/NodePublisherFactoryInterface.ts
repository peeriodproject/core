import NodePublisherList = require('./NodePublisherList');

/**
 * Creates a list of NodePublishers
 *
 * @interface
 * @class core.protocol.nodeDiscovery.NodePublisherFactoryInterface
 */
interface NodePublisherFactoryInterface {

	/**
	 * Creates a list of ndoe publishers
	 *
	 * @method core.protocol.nodeDiscovery.NodePublisherFactoryInterface#createPublisherList
	 *
	 * @param {Function} callback Function that gets called when the publisher list has been created with a NodePublisherList as argument
	 */
	createPublisherList (callback:(list:NodePublisherList) => any):void;
}

export = NodePublisherFactoryInterface;