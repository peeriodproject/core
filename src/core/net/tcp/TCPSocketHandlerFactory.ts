import TCPSocketFactoryInterface = require('./interfaces/TCPSocketFactoryInterface');
import TCPSocketHandlerFactoryInterface = require('./interfaces/TCPSocketHandlerFactoryInterface');
import TCPSocketHandlerInterface = require('./interfaces/TCPSocketHandlerInterface');
import TCPSocketHandlerOptions = require('./interfaces/TCPSocketHandlerOptions');
import TCPSocketHandler = require('./TCPSocketHandler');

class TCPSocketHandlerFactory implements TCPSocketHandlerFactoryInterface {
	create (socketFactory: TCPSocketFactoryInterface, opts:TCPSocketHandlerOptions):TCPSocketHandlerInterface {
		return new TCPSocketHandler(socketFactory, opts);
	}
}

export = TCPSocketHandlerFactory;