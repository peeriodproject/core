import ReadableCellCreatedRejectedMessageInterface = require('./interfaces/ReadableCellCreatedRejectedMessageInterface');

/**
 * ReadableCellCreatedRejectMessageInterface implementation.
 *
 * @class core.protocol.hydra.ReadableCellCreatedRejectedMessage
 * @implements core.protocol.hydra.ReadableCellCreatedRejectedMessageInterface
 *
 * @param {Buffer} buffer The buffer to deformat.
 */
class ReadableCellCreatedRejectedMessage implements ReadableCellCreatedRejectedMessageInterface {

	/**
	 * @member {Buffer} core.protocol.hydra.ReadableCellCreatedRejectedMessage~_dhPayload
	 */
	private _dhPayload:Buffer = null;

	/**
	 * @member {boolean} core.protocol.hydra.ReadableCellCreatedRejectedMessage~_isRejected
	 */
	private _isRejected:boolean = false;

	/**
	 * @member {Buffer} core.protocol.hydra.ReadableCellCreatedRejectedMessage~_secretHash
	 */
	private _secretHash:Buffer = null;

	/**
	 * @member {string) core.protocol.hydra.ReadableCellCreatedRejectedMessage~_uuid
	 */
	private _uuid:string = null;

	public constructor (buffer:Buffer) {
		if (buffer.length < 16) {
			throw new Error('ReadableCellCreatedRejectedMessage: Message too short!');
		}

		if (buffer.length === 16) {
			this._isRejected = true;
		}

		this._uuid = buffer.slice(0, 16).toString('hex');

		if (!this._isRejected) {
			this._secretHash = buffer.slice(16, 36);
			this._dhPayload = buffer.slice(36);

			if (this._dhPayload.length !== 2048) {
				throw new Error('ReadableCellCreatedRejectedMessage: Diffie-Hellman bad length!');
			}
		}
	}

	public getDHPayload ():Buffer {
		return this._dhPayload;
	}

	public getSecretHash ():Buffer {
		return this._secretHash;
	}

	public getUUID ():string {
		return this._uuid;
	}

	public isRejected ():boolean {
		return this._isRejected;
	}

}

export = ReadableCellCreatedRejectedMessage;