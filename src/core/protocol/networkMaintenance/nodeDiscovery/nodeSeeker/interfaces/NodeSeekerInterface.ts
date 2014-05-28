/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeInterface = require('../../../../../topology/interfaces/ContactNodeInterface');

/**
 *
 * @interface
 * @class core.protocol.nodeDiscovery.NodeSeekerInterface
 */
interface NodeSeekerInterface {

	seek (callback:(node:ContactNodeInterface) => any):void;

}

export = NodeSeekerInterface;