import WritableHydraMessageFactoryInterface = require('./interfaces/WritableHydraMessageFactoryInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * WritableHydraMessageFactoryInterface impelementation.
 *
 * @class core.protocol.hydra.WritableHydraMessageFactory
 * @implements core.protocol.hydra.WritableHydraMessageFactoryInterface
 */
class WritableHydraMessageFactory implements WritableHydraMessageFactoryInterface {

	public constructMessage (msgType:string, payload:Buffer, payloadLength?:number, circuitId?:string):Buffer {
		payloadLength = payloadLength ? payloadLength : payload.length;

		var indicatorByte:number = HydraByteCheatsheet.hydraMessageTypes[msgType];

		if (!indicatorByte) {
			throw new Error('WritableHydraMessageFactory: Unknow message type.');
		}

		var circIdBuf:Buffer = (circuitId && HydraByteCheatsheet.circuitMessages.indexOf(msgType) > -1) ? new Buffer(circuitId, 'hex') : new Buffer(0);

		return Buffer.concat([new Buffer([indicatorByte]), circIdBuf, payload], payloadLength + 1 + circIdBuf.length);
	}

}

export = WritableHydraMessageFactory;