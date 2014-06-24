import BroadcastReadableMessageInterface = require('./interfaces/BroadcastReadableMessageInterface');

class BroadcastReadableMessage implements BroadcastReadableMessageInterface {

	private _broadcastId:string = null;
	private _payload:Buffer = null;
	private _timestamp:number = null;

	public constructor (buffer:Buffer) {
		if (buffer.length < 16) {
			throw new Error('BroadcastReadableMessage: Message too short.');
		}

		this._broadcastId = buffer.slice(0, 8).toString('hex');

		var timestampBuffer = buffer.slice(8, 16);
		this._timestamp = timestampBuffer.slice(0, 4).readUInt32BE(0) * 1000 + timestampBuffer.slice(4).readUInt32BE(0);

		this._payload = buffer.slice(16);

		if (this._payload.length === 0) {
			throw new Error('BroadcastReadableMessage: Empty payload.');
		}
	}

	public getBroadcastId ():string {
		return this._broadcastId;
	}

	public getPayload ():Buffer {
		return this._payload;
	}

	public getTimestamp ():number {
		return this._timestamp;
	}

}

export = BroadcastReadableMessage;