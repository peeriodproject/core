import ReadableHydraMessageInterface = require('./interfaces/ReadableHydraMessageInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * ReadableHydraMessageInterface implementation.
 * For information of how the message is structured, see the interface {@link core.protocol.hydra.ReadableHydraMessageInterface}
 *
 * @class core.protocol.hydra.ReadableHydraMessage
 * @implements core.protocol.hydra.ReadableHydraMessageInterface
 *
 * @param {Buffer} buffer Input data to deconstruct.
 */
class ReadableHydraMessage implements ReadableHydraMessageInterface {

	/**
	 * @member {string} core.protocol.hydra.ReadableHydraMessage~_circuitId
	 */
	private _circuitId:string = null;

	/**
	 * @member {string} core.protocol.hydra.ReadableHydraMessage~_msgType
	 */
	private _msgType:string = null;

	/**
	 * @member {Buffer} core.protocol.hydra.ReadableHydraMessage~_payload
	 */
	private _payload:Buffer = null;

	constructor (buffer:Buffer) {
		var bufLen:number = buffer.length;
		var sliceFrom:number = 1;

		if (!bufLen) {
			throw new Error('ReadableHydraMessage: Unrecognizable hydra message');
		}

		this._extractMessageType(buffer[0]);

		if (this._isCircuitMessage()) {
			this._circuitId = buffer.slice(sliceFrom, sliceFrom + 16).toString('hex');
			sliceFrom += 16;
		}


		this._payload = buffer.slice(sliceFrom);
	}

	public getCircuitId ():string {
		return this._circuitId;
	}

	public getMessageType ():string {
		return this._msgType;
	}

	public getPayload ():Buffer {
		return this._payload;
	}

	/**
	 * @method core.protocol.hydra.ReadableHydraMessage~_extractMessageType
	 *
	 * @param {number} octet Indicator byte
	 */
	private _extractMessageType (octet:number) {
		var msgTypes = Object.keys(HydraByteCheatsheet.hydraMessageTypes);
		var msgTypeLength = msgTypes.length;

		for (var i = 0; i < msgTypeLength; i++) {
			if (HydraByteCheatsheet.hydraMessageTypes[msgTypes[i]] === octet) {
				this._msgType = msgTypes[i];
			}
		}

		if (!this._msgType) {
			throw new Error('ReadableHydraMessage: Could not find msg type for given input.');
		}
	}

	private _isCircuitMessage ():boolean {
		return HydraByteCheatsheet.circuitMessages.indexOf(this.getMessageType()) > -1;
	}

}

export = ReadableHydraMessage;