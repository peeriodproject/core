import HydraNode = require('./HydraNode');

/**
 * @interface
 * @class core.protocol.hydra.HydraNodeMap
 */
interface HydraNodeMap {
	[identifier:string]:HydraNode;
}

export = HydraNodeMap;