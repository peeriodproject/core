import ReadableShareAbortMessageFactoryInterface = require('./interfaces/ReadableShareAbortMessageFactoryInterface');
import ReadableShareAbortMessageInterface = require('./interfaces/ReadableShareAbortMessageInterface');
import ReadableShareAbortMessage = require('./ReadableShareAbortMessage');

/**
 * ReadableShareAbortMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableShareAbortMessageFactory
 * @implements core.protocol.fileTransfer.share.ReadableShareAbortMessageFactoryInterface
 */
class ReadableShareAbortMessageFactory implements ReadableShareAbortMessageFactoryInterface {

	public create (buffer:Buffer):ReadableShareAbortMessageInterface {
		try {
			return new ReadableShareAbortMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}
}

export = ReadableShareAbortMessageFactory;