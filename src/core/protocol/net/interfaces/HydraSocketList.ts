import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * @interface
 * @class core.protocol.net.HydraSocketList
 */
interface HydraSocketList {
	[identifier:string]:TCPSocketInterface;
}

export = HydraSocketList;