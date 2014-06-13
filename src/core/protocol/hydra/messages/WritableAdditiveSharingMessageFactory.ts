import net = require('net');

import WritableAdditiveSharingMessageFactoryInterface = require('./interfaces/WritableAdditiveSharingMessageFactoryInterface');
import ContactNodeAddress = require('../../../topology/ContactNodeAddress');
import MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');

/**
 * WritableAdditiveSharingMessageFactoryInterface implementation.
 *
 * @class core.protocol.hydra.WritableAdditiveSharingMessageFactory
 * @implements core.protocol.hydra.WritableAdditiveSharingMessageFactoryInterface
 */
class WritableAdditiveSharingMessageFactory implements WritableAdditiveSharingMessageFactoryInterface {

	public constructMessage (relayToIp:string, relayToPort:number, payload:Buffer, payloadLength?:number):Buffer {

		payloadLength = payloadLength ? payloadLength : payload.length;

		var indicatorByte:number = 0;
		var toAdd:number = 1;

		if (net.isIPv4(relayToIp)) {
			indicatorByte = MessageByteCheatsheet.ipv4;
			toAdd += 6;
		}
		else if (net.isIPv6(relayToIp)) {
			indicatorByte = MessageByteCheatsheet.ipv6;
			toAdd += 18;
		}
		else {
			throw new Error('WritableAdditiveSharingMessageFactory: Unrecognizable IP address');
		}

		var addressBuffer:Buffer = ContactNodeAddress.ipPortAsBuffer(relayToIp, relayToPort);

		return Buffer.concat([new Buffer([indicatorByte]), addressBuffer, payload], payloadLength + toAdd);
	}

}

export = WritableAdditiveSharingMessageFactory;