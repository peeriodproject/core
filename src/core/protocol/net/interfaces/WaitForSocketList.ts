import WaitForSocket = require('./WaitForSocket');

/**
 * @interface
 * @class core.protocol.net.WaitForSocketList
 */
interface WaitForSocketList {
	[identifier:string]:WaitForSocket;
}

export = WaitForSocketList;

