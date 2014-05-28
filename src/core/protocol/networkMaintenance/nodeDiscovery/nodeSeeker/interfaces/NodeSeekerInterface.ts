/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeInterface = require('../../../../../topology/interfaces/ContactNodeInterface');

/**
 * A NodeSeeker's only objective is to obtain information about a ContactNode from whatever source.
 *
 * @interface
 * @class core.protocol.nodeDiscovery.NodeSeekerInterface
 */
interface NodeSeekerInterface {

	/**
	 * Seeks information about a contact node.
	 *
	 * @param {Function} callback Function which gets called when the search is completed. If a node has been found,
	 * it is passed in as an argument, otherwise gets called with `null`.
	 */
	seek (callback:(node:ContactNodeInterface) => any):void;

}

export = NodeSeekerInterface;