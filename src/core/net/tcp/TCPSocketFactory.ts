import net = require('net');

import TCPSocketFactoryInterface = require('./interfaces/TCPSocketFactoryInterface');
import TCPSocketInterface = require('./interfaces/TCPSocketInterface');
import TCPSocketOptions = require('./interfaces/TCPSocketOptions');
import TCPSocket = require('./TCPSocket')

/**
 * @class core.net.tcp.TCPSocketFactory
 * @implements core.net.tcp.TCPSocketFactoryInterface
 */
class TCPSocketFactory implements TCPSocketFactoryInterface {

	create(socket:net.Socket, opts:TCPSocketOptions):TCPSocketInterface {
		return new TCPSocket(socket, opts);
	}
}

export = TCPSocketFactory;