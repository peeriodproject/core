import WritableCellCreatedRejectedMessageFactoryInterface = require('./interfaces/WritableCellCreatedRejectedMessageFactoryInterface');

/**
 * WritableCellCreatedRejectedMessageFactoryInterface implementation.
 *
 * @class core.protocol.hydra.WritableCellCreatedRejectedMessageFactory
 * @implements core.protocol.hydra.WritableCellCreatedRejectedMessageFactoryInterface
 */
class WritableCellCreatedRejectedMessageFactory implements WritableCellCreatedRejectedMessageFactoryInterface {

	public constructMessage (uuid:string, secretHash?:Buffer, dhPayload?:Buffer):Buffer {
		if (uuid.length !== 32) {
			throw new Error('WritableCellCreatedRejectedMessageFactory: UUID must be of 16 octets.');
		}

		if (secretHash && !dhPayload) {
			throw new Error('WritableCellCreatedRejectedMessageFactory: Secret hash AND Diffie-Hellman must be present.');
		}

		if (secretHash && secretHash.length !== 20) {
			throw new Error('WritableCellCreatedRejectedMessageFactory: Secret hash must be of SHA-1 hash length.');
		}

		if (dhPayload && dhPayload.length !== 2048) {
			throw new Error('WritableCellCreatedRejectedMessageFactory: Diffie-Hellman payload must be of length 2048!');
		}

		var uuidBuf:Buffer = new Buffer(uuid, 'hex');


		return secretHash ? Buffer.concat([uuidBuf, secretHash, dhPayload], 2084) : uuidBuf;
	}
}

export = WritableCellCreatedRejectedMessageFactory;