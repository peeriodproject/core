import ReadableBlockMessageFactoryInterface = require('./interfaces/ReadableBlockMessageFactoryInterface');
import ReadableBlockMessageInterface = require('./interfaces/ReadableBlockMessageInterface');
import ReadableBlockMessage = require('./ReadableBlockMessage');

/**
 * @class core.protocol.fileTransfer.share.ReadableBlockMessageFactory
 * @implements core.protocol.fileTransfer.share.ReadableBlockMessageFactoryInterface
 */
class ReadableBlockMessageFactory implements ReadableBlockMessageFactoryInterface {

	create (buffer:Buffer):ReadableBlockMessageInterface {

		try {
			return new ReadableBlockMessage(buffer);
		}
		catch (e) {
			return null;
		}
	}
}

export = ReadableBlockMessageFactory;