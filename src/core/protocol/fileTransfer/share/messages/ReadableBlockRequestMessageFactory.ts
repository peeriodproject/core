import ReadableBlockRequestMessageFactoryInterface = require('./interfaces/ReadableBlockRequestMessageFactoryInterface');
import ReadableBlockRequestMessageInterface = require('./interfaces/ReadableBlockRequestMessageInterface');
import ReadableBlockRequestMessage = require('./ReadableBlockRequestMessage');

/**
 * ReadableBlockRequestMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactory
 * @interface core.protocol.fileTransfer.share.ReadableBlockRequestMessageFactoryInterface
 */
class ReadableBlockRequestMessageFactory implements ReadableBlockRequestMessageFactoryInterface {

	public create (buffer:Buffer):ReadableBlockRequestMessageInterface {
		try {
			return new ReadableBlockRequestMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}
}

export = ReadableBlockRequestMessageFactory;