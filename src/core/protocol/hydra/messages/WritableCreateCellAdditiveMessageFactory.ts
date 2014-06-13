import WritableCreateCellAdditiveMessageFactoryInterface = require('./interfaces/WritableCreateCellAdditiveMessageFactoryInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * WritableCreateellAdditiveMessageFactoryInterface implementation.
 *
 * @class core.protocol.hyra.WritableCreateellAdditiveMessageFactory
 * @implements core.protocol.hyra.WritableCreatCellAdditiveMessageFactoryInterface
 */
class WritableCreateCellAdditiveMessageFactory implements WritableCreateCellAdditiveMessageFactoryInterface {

	public constructMessage (isInitiator:boolean, uuid:string, additivePayload:Buffer, circuitId?:string):Buffer {
		if (additivePayload.length !== 2048) {
			throw new Error('WritableCreateCellAdditiveMessageFactory: Additive payload must be of length 2048!');
		}

		if (isInitiator && !circuitId) {
			throw new Error('WritableCreateCellAdditiveMessageFactory: Circuit ID required when message is initiator');
		}

		if (circuitId && circuitId.length !== 32) {
			throw new Error('WritableCreateCellAdditiveMessageFactory: Circuit ID must have 16 octets.')
		}

		if (uuid.length !== 32) {
			throw new Error('WritableCreateCellAdditiveMessageFactory: UUID must have 16 octets.')
		}

		var indicatorBuffer:Buffer = new Buffer([isInitiator ? HydraByteCheatsheet.createCellAdditive.isInitiator : HydraByteCheatsheet.createCellAdditive.notInitiator]);

		var circuitIdBuffer:Buffer = isInitiator ? new Buffer(circuitId, 'hex') : new Buffer(0);

		var uuidBuffer:Buffer = new Buffer(uuid, 'hex');

		return Buffer.concat([indicatorBuffer, circuitIdBuffer, uuidBuffer, additivePayload], isInitiator ? 2081 : 2065);
	}

}

export = WritableCreateCellAdditiveMessageFactory;