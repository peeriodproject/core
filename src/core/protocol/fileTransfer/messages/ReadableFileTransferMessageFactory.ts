import ReadableFileTransferMessageInterface = require('./interfaces/ReadableFileTransferMessageInterface');
import ReadableFileTransferMessageFactoryInterface = require('./interfaces/ReadableFileTransferMessageFactoryInterface');
import ReadableFileTransferMessage = require('./ReadableFileTransferMessage');

/**
 * @class core.protocol.fileTransfer.ReadableFileTransferMessageFactory
 * @implements core.protocol.fileTransfer.ReadableFileTransferMessageFactoryInterface
 */
class ReadableFileTransferMessageFactory implements ReadableFileTransferMessageFactoryInterface {

	public create (buffer:Buffer):ReadableFileTransferMessageInterface {
		var msg:ReadableFileTransferMessageInterface = null;

		try {
			msg = new ReadableFileTransferMessage(buffer);
		}
		catch (e) {

		}

		return msg;
	}

}

export = ReadableFileTransferMessageFactory;