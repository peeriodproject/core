import IncomingPendingSocket = require('./IncomingPendingSocket');

/**
 * @interface
 * @class core.protocol.net.IncomingPendingSocketList
 */
interface IncomingPendingSocketList {
	[identifier:string]:IncomingPendingSocket;
}

export = IncomingPendingSocketList;