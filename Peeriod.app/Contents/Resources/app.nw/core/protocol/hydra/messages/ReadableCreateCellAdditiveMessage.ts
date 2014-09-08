import ReadableCreateCellAdditiveMessageInterface = require('./interfaces/ReadableCreateCellAdditiveMessageInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * ReadableCreateCellAdditiveMessageInterface implementation.
 *
 * @class core.protocol.hydra.ReadableCreateCellAdditiveMessage
 * @implements core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface
 *
 * @param {Buffer} buffer The buffer to construct the message from.
 */
class ReadableCreateCellAdditiveMessage implements ReadableCreateCellAdditiveMessageInterface {

	/**
	 * @member {Buffer} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_additivePayload
	 */
	private _additivePayload:Buffer = null;

	/**
	 * @member {string} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_circuitId
	 */
	private _circuitId:string = null;

	/**
	 * @member {boolean} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_isInitiator
	 */
	private _isInitiator:boolean = false;

	/**
	 * @member {string} core.protocol.hydra.ReadableCreateCellAdditiveMessage~_uuid
	 */
	private _uuid:string = null;

	public constructor (buffer:Buffer) {
		var indicatorByte:number = buffer[0];
		var continueAt:number = 1;

		if (indicatorByte === HydraByteCheatsheet.createCellAdditive.isInitiator) {
			this._isInitiator = true;
			this._circuitId = buffer.slice(1, 17).toString('hex');
			continueAt = 17;
		}
		else if (indicatorByte !== HydraByteCheatsheet.createCellAdditive.notInitiator) {
			throw new Error('CreateCellAdditiveMessage: Unknow indicator byte.');
		}

		this._uuid = buffer.slice(continueAt, continueAt + 16).toString('hex');

		this._additivePayload = buffer.slice(continueAt + 16);

		if (this._additivePayload.length !== 256) {
			throw new Error('CreateCellAdditiveMessage: Additive payload bad length error.');
		}

	}

	public isInitiator ():boolean {
		return this._isInitiator;
	}

	public getCircuitId ():string {
		return this._circuitId;
	}

	public getUUID ():string {
		return this._uuid;
	}

	public getAdditivePayload ():Buffer {
		return this._additivePayload;
	}

}

export = ReadableCreateCellAdditiveMessage;