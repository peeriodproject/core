import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');

/**
 * @interface
 * @class core.protocol.ping.PongWaitingSlot
 */
interface PongWaitingSlot {
	newNode:ContactNodeInterface;
	nodeToCheck:ContactNodeInterface;
	timeout:number;
}

export = PongWaitingSlot;