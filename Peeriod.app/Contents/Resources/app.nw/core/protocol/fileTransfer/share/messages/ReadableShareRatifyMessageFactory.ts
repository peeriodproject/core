import ReadableShareRatifyMessageFactoryInterface = require('./interfaces/ReadableShareRatifyMessageFactoryInterface');
import ReadableShareRatifyMessageInterface = require('./interfaces/ReadableShareRatifyMessageInterface');
import ReadableShareRatifyMessage = require('./ReadableShareRatifyMessage');

/**
 * ReadableShareRatifyMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactory
 * @implements core.protocol.fileTransfer.share.ReadableShareRatifyMessageFactoryInterface
 */
class ReadableShareRatifyMessageFactory implements ReadableShareRatifyMessageFactoryInterface {

	public create (buffer:Buffer):ReadableShareRatifyMessageInterface {
		try {
			return new ReadableShareRatifyMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}

}

export = ReadableShareRatifyMessageFactory;