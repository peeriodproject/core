import net = require('net');

import TCPSocketInterface = require('./TCPSocketInterface');
import TCPSocketOptions = require('./TCPSocketOptions');

/**
 * @interface
 * @class core.net.tcp.TCPSocketFactoryInterface
 */
interface TCPSocketFactoryInterface {

	create (socket:net.Socket, opts:TCPSocketOptions):TCPSocketInterface;

}

export = TCPSocketFactoryInterface;