import OutgoingPendingSocket = require('./OutgoingPendingSocket');

/**
 * @interface
 * @class core.protocol.net.OutgoingPendingSocketList
 */
interface OutgoingPendingSocketList {
	[identifier:string]:OutgoingPendingSocket;
}

export = OutgoingPendingSocketList;