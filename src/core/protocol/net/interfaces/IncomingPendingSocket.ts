import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * @interface
 * @class core.protocol.net.IncomingPendingSocket
 */
interface IncomingPendingSocket {
	socket:TCPSocketInterface;
	timeout:number;
}

export = IncomingPendingSocket;