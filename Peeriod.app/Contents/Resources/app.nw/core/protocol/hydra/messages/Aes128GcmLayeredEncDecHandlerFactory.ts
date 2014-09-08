import LayeredEncDecHandlerFactoryInterface = require('./interfaces/LayeredEncDecHandlerFactoryInterface');
import LayeredEncDecHandlerInterface = require('./interfaces/LayeredEncDecHandlerInterface');
import HydraNode = require('../interfaces/HydraNode');
import Aes128GcmLayeredEncDecHandler = require('./Aes128GcmLayeredEncDecHandler');

/**
 * AES-128-GCM implementation of LayeredEncDecHandlerFactoryInterface.
 *
 * @class core.protocol.hydra.Aes128GcmLayeredEncDecHandlerFactory
 * @implements core.protocol.hyfra.LayeredEncDecHandlerFactoryInterface
 */
class Aes128GcmLayeredEncDecHandlerFactory implements LayeredEncDecHandlerFactoryInterface {

	create (initialNode?:HydraNode):LayeredEncDecHandlerInterface {
		return new Aes128GcmLayeredEncDecHandler(initialNode);
	}
}

export = Aes128GcmLayeredEncDecHandlerFactory;
