import BroadcastWritableMessageFactoryInterface = require('./interfaces/BroadcastWritableMessageFactoryInterface');

class BroadcastWritableMessageFactory implements BroadcastWritableMessageFactoryInterface {

	public constructPayload (broadcastId:string, payload:Buffer, payloadLength?:number):Buffer {
		var payloadLength = payloadLength || payload.length;
		var broadcastIdBuffer:Buffer = new Buffer(broadcastId, 'hex');

		if (broadcastIdBuffer.length !== 8) {
			throw new Error('BroadcastWritableMessageFactory: BroadcastID must be 8 byte long!');
		}

		var timestampBuffer = new Buffer(8);
		var timestamp:number = Date.now();

		timestampBuffer.writeUInt32BE(Math.floor(timestamp / 1000), 0);
		timestampBuffer.writeUInt32BE(timestamp % 1000, 4);

		return Buffer.concat([broadcastIdBuffer, timestampBuffer, payload], payloadLength + 16);
	}

}

export = BroadcastWritableMessageFactory;