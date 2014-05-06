import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * @interface
 * @class core.protocol.net.OutgoingPendingSocket
 */
interface OutgoingPendingSocket {
	socket:TCPSocketInterface;
	closeAtOnce:boolean;
}

export = OutgoingPendingSocket;