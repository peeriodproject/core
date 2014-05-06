import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * @interface
 * @class core.protocol.net.ConfirmedSocket
 */
interface ConfirmedSocket {
	socket:TCPSocketInterface;
	direction:string;
}

export = ConfirmedSocket;