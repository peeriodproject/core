import ReadableEncryptedShareMessageFactoryInterface = require('./interfaces/ReadableEncryptedShareMessageFactoryInterface');
import ReadableEncryptedShareMessageInterface = require('./interfaces/ReadableEncryptedShareMessageInterface');
import ReadableEncryptedShareMessage = require('./ReadableEncryptedShareMessage');

/**
 * ReadableEncryptedShareMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactory
 * @implements core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface
 */
class ReadableEncryptedShareMessageFactory implements ReadableEncryptedShareMessageFactoryInterface {

	public create (buffer:Buffer):ReadableEncryptedShareMessageInterface {
		try {
			return new ReadableEncryptedShareMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}
}

export = ReadableEncryptedShareMessageFactory;