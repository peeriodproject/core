import WritableHydraMessageFactoryInterface = require('./interfaces/WritableHydraMessageFactoryInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * WritableHydraMessageFactoryInterface impelementation.
 *
 * @class core.protocol.hydra.WritableHydraMessageFactory
 * @implements core.protocol.hydra.WritableHydraMessageFactoryInterface
 */
class WritableHydraMessageFactory implements WritableHydraMessageFactoryInterface {

	public constructMessage (msgType:string, payload:Buffer, payloadLength?:number):Buffer {
		payloadLength = payloadLength ? payloadLength : payload.length;

		var indicatorByte:number = HydraByteCheatsheet.hydraMessageTypes[msgType];

		if (!indicatorByte) {
			throw new Error('WritableHydraMessageFactory: Unknow message type.');
		}

		return Buffer.concat([new Buffer([indicatorByte]), payload], payloadLength + 1);
	}

}

export = WritableHydraMessageFactory;