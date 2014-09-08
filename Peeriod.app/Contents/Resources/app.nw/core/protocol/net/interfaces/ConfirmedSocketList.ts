import ConfirmedSocket = require('./ConfirmedSocket');

/**
 * @interface
 * @class core.protocol.net.ConfirmedSocketList
 */
interface ConfirmedSocketList {
	[identifier:string]:ConfirmedSocket;
}

export = ConfirmedSocketList;