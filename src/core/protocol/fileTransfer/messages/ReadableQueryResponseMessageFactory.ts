import ReadableQueryResponseMessageFactoryInterface = require('./interfaces/ReadableQueryResponseMessageFactoryInterface');
import ReadableQueryResponseMessageInterface = require('./interfaces/ReadableQueryResponseMessageInterface');
import ReadableQueryResponseMessage = require('./ReadableQueryResponseMessage');

/**
 * ReadableQueryResponseMessageFactory implementation.
 *
 * @class core.protocol.fileTransfer.ReadableQueryResponseMessageFactory
 * @implements core.protocol.fileTransfer.ReadableQueryResponseMessageFactoryInterface
 */
class ReadableQueryResponseMessageFactory implements ReadableQueryResponseMessageFactoryInterface {

	public create (buffer:Buffer):ReadableQueryResponseMessageInterface {
		try {
			return new ReadableQueryResponseMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}

}

export = ReadableQueryResponseMessageFactory;