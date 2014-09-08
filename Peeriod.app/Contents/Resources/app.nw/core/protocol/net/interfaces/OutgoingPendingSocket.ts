import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * @interface
 * @class core.protocol.net.OutgoingPendingSocket
 */
interface OutgoingPendingSocket {
	closeAtOnce:boolean;
}

export = OutgoingPendingSocket;