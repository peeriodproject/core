import TCPSocketHandlerOptions = require('./TCPSocketHandlerOptions');
import TCPSocketHandlerInterface = require('./TCPSocketHandlerInterface');
import TCPSocketFactoryInterface = require('./TCPSocketFactoryInterface');

interface TCPSocketHandlerFactoryInterface {
	create (socketFactory:TCPSocketFactoryInterface, opts:TCPSocketHandlerOptions):TCPSocketHandlerInterface;
}

export = TCPSocketHandlerFactoryInterface;