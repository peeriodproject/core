import BroadcastReadableMessageFactoryInterface = require('./interfaces/BroadcastReadableMessageFactoryInterface');
import BroadcastReadableMessageInterface = require('./interfaces/BroadcastReadableMessageInterface');
import BroadcastReadableMessage = require('./BroadcastReadableMessage');

/**
 * BroadcastReadableMessageFactoryInterface implementation
 *
 * @class core.protocol.broadcast.BroadcastReadableMessageFactory
 * @implements core.protocol.broadcast.BroadcastReadableMessageFactoryInterface
 */
class BroadcastReadableMessageFactory implements BroadcastReadableMessageFactoryInterface {

	public create (buffer:Buffer):BroadcastReadableMessageInterface {
		var msg:BroadcastReadableMessageInterface = null;

		try {
			msg = new BroadcastReadableMessage(buffer);
		}
		catch (e) {
		}

		return msg;
	}

}

export = BroadcastReadableMessageFactory;