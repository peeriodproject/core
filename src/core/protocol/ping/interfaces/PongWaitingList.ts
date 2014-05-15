import PongWaitingSlot = require('./PongWaitingSlot');

/**
 * @interface
 * @class core.protocol.ping.PongWaitingList
 * @extends Array<core.protocol.ping.PongWaitingSlot>
 */
interface PongWaitingList extends Array<PongWaitingSlot> {
}

export = PongWaitingList;