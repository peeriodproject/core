import ReadableCreateCellAdditiveMessage = require('./ReadableCreateCellAdditiveMessage');
import ReadableCreateCellAdditiveMessageInterface = require('./interfaces/ReadableCreateCellAdditiveMessageInterface');
import ReadableCreateCellAdditiveMessageFactoryInterface = require('./interfaces/ReadableCreateCellAdditiveMessageFactoryInterface');

/**
 * @class core.protocol.hydra.ReadableCreateCellAdditiveMessageFactory
 * @implements core.protocol.hydra.ReadableCreateCellAdditiveMessageFactoryInterface
 */
class ReadableCreateCellAdditiveMessageFactory implements ReadableCreateCellAdditiveMessageFactoryInterface {

	public create (buffer:Buffer):ReadableCreateCellAdditiveMessageInterface {
		return new ReadableCreateCellAdditiveMessage(buffer);
	}
}

export = ReadableCreateCellAdditiveMessageFactory;
