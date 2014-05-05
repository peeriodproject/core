import TCPSocketFactoryInterface = require('./TCPSocketFactoryInterface');
import TCPSocketHandlerInterface = require('./TCPSocketHandlerInterface');
import TCPSocketHandlerOptions = require('./TCPSocketHandlerOptions');

/**
 * @interface
 * @class core.net.tcp.TCPSocketHandlerFactoryInterface
 */
interface TCPSocketHandlerFactoryInterface {

	/**
	 * @method core.net.tcp.TCPSocketHandlerFactoryInterface#create
	 *
	 * @param {core.net.tcp.TCPSocketFactoryInterface} socketFactory
	 * @param {core.net.tcp.TCPSocketHandlerOptions} options
	 * @return {core.net.tcp.TCPSocketHandlerInterface}
	 */
	create (socketFactory:TCPSocketFactoryInterface, options:TCPSocketHandlerOptions):TCPSocketHandlerInterface;

}

export = TCPSocketHandlerFactoryInterface;