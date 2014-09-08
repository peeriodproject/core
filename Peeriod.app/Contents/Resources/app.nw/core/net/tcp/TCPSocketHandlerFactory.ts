import TCPSocketFactoryInterface = require('./interfaces/TCPSocketFactoryInterface');
import TCPSocketHandlerFactoryInterface = require('./interfaces/TCPSocketHandlerFactoryInterface');
import TCPSocketHandlerInterface = require('./interfaces/TCPSocketHandlerInterface');
import TCPSocketHandlerOptions = require('./interfaces/TCPSocketHandlerOptions');

import TCPSocketHandler = require('./TCPSocketHandler');

/**
 * @class core.net.tcp.TCPSocketHandlerFactory
 * @implements core.net.tcp.TCPSocketHandlerFactoryInterfacer
 */
class TCPSocketHandlerFactory implements TCPSocketHandlerFactoryInterface {

	public create (socketFactory: TCPSocketFactoryInterface, options:TCPSocketHandlerOptions):TCPSocketHandlerInterface {
		return new TCPSocketHandler(socketFactory, options);
	}

}

export = TCPSocketHandlerFactory;