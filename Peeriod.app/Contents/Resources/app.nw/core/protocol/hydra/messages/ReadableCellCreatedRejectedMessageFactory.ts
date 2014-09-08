import ReadableCellCreatedRejectedMessageFactoryInterface = require('./interfaces/ReadableCellCreatedRejectedMessageFactoryInterface');
import ReadableCellCreatedRejectedMessageInterface = require('./interfaces/ReadableCellCreatedRejectedMessageInterface');
import ReadableCellCreatedRejectedMessage = require('./ReadableCellCreatedRejectedMessage');

/**
 * ReadableCellCreatedRejectedMessageFactoryInterface implementation.
 *
 * @class core.protocol.hydra.ReadableCellCreatedRejectedMessageFactory
 * @implements core.protocol.hydra.ReadableCellCreatedRejectedMessageFactoryInterface
 */
class ReadableCellCreatedRejectedMessageFactory implements ReadableCellCreatedRejectedMessageFactoryInterface {

	public create (buffer:Buffer):ReadableCellCreatedRejectedMessageInterface {
		return new ReadableCellCreatedRejectedMessage(buffer);
	}

}

export = ReadableCellCreatedRejectedMessageFactory;