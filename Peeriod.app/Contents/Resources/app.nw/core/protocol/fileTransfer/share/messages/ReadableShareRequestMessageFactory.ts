import ReadableShareRequestMessageFactoryInterface = require('./interfaces/ReadableShareRequestMessageFactoryInterface');
import ReadableShareRequestMessageInterface = require('./interfaces/ReadableShareRequestMessageInterface');
import ReadableShareRequestMessage = require('./ReadableShareRequestMessage');

/**
 * ReadableShareRequestMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableShareRequestMessageFactory
 * @implements core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface
 */
class ReadableShareRequestMessageFactory implements ReadableShareRequestMessageFactoryInterface {

	public create (buffer:Buffer):ReadableShareRequestMessageInterface {
		try {
			return new ReadableShareRequestMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}

}

export = ReadableShareRequestMessageFactory;