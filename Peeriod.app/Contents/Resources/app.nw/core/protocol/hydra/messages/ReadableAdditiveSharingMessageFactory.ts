import ReadableAdditiveSharingMessageFactoryInterface = require('./interfaces/ReadableAdditiveSharingMessageFactoryInterface');
import ReadableAdditiveSharingMessage = require('./ReadableAdditiveSharingMessage');
import ReadableAdditiveSharingMessageInterface = require('./interfaces/ReadableAdditiveSharingMessageInterface');

/**
 * @class core.protocol.hydra.ReadableAdditiveSharingMessageFactory
 * @implements core.protocol.hydra.ReadableAdditiveSharingMessageFactoryInterface
 */
class ReadableAdditiveSharingMessageFactory implements ReadableAdditiveSharingMessageFactoryInterface {

	public create (buffer:Buffer):ReadableAdditiveSharingMessageInterface {
		return new ReadableAdditiveSharingMessage(buffer);
	}
}

export = ReadableAdditiveSharingMessageFactory;