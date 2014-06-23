import ReadableDecryptedMessageFactoryInterface = require('./interfaces/ReadableDecryptedMessageFactoryInterface');
import ReadableDecryptedMessageInterface = require('./interfaces/ReadableDecryptedMessageInterface');
import Aes128GcmReadableDecryptedMessage = require('./Aes128GcmReadableDecryptedMessage');

/**
 * AES-128-GCM implementation of ReadableDecryptedMessageFactoryInterface
 *
 * @class core.protocol.hydra.Aes128GcmReadableDecryptedMessageFactory
 * @implements core.protocol.hydra.ReadableDecryptedMessageFactoryInterface
 */
class Aes128GcmReadableDecryptedMessageFactory implements ReadableDecryptedMessageFactoryInterface {

	public create (encryptedContent:Buffer, key:Buffer):ReadableDecryptedMessageInterface {
		var msg:Aes128GcmReadableDecryptedMessage = null;

		try {
			msg = new Aes128GcmReadableDecryptedMessage(encryptedContent, key);
		}
		catch (e) {
			throw e;
		}

		return msg;
	}

}

export = Aes128GcmReadableDecryptedMessageFactory;