import PongWaitingSlot = require('./PongWaitingSlot');

/**
 * @interface
 * @class core.protocol.ping.PongWaitingList
 */
interface PongWaitingList extends Array<PongWaitingSlot> {
}

export = PongWaitingList;