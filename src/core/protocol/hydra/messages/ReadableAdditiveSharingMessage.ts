import net = require('net');

import ReadableAdditiveSharingMessageInterface = require('./interfaces/ReadableAdditiveSharingMessageInterface');
import MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');

/**
 * AdditiveSharingMessageInterface implementation.
 * Extracts a given buffer.
 * For detailed information of the message's parts see the interface.
 *
 * @class core.potocol.hydra.ReadableAdditiveSharingMessage
 * @implements core.potocol.hydra.ReadableAdditiveSharingMessageInterface
 *
 * @param {Buffer} buffer The buffer to split up into its separate parts.
 */
class ReadableAdditiveSharingMessage implements ReadableAdditiveSharingMessageInterface {

	/**
	 * The extracted IP address.
	 *
	 * @member {string} core.protocol.hydra.ReadableAdditiveSharingMessage~_ip
	 */
	private _ip:string = null;

	/**
	 * The extracted payload for the CREATE_CELL_ADDITIVE message.
	 *
	 * @member {Buffer) core.protocol.hydra.ReadableAdditiveSharingMessage~_payload
	 */
	private _payload:Buffer = null;

	/**
	 * The extracted port.
	 *
	 * @member {number} core.protocol.hydra.ReadableAdditiveSharingMessage~_port
	 */
	private _port:number = null;

	public constructor (buffer:Buffer) {
		var addressIndicator:number = buffer[0];
		var portFrom:number = 5;
		var ipError:boolean = false;
		var ip:string = '';

		if (addressIndicator === MessageByteCheatsheet.ipv4) {
			ip = buffer.slice(1, 5).toJSON().join('.');

			if (!net.isIPv4(ip)) {
				ipError = true;
			}

		}
		else if (addressIndicator == MessageByteCheatsheet.ipv6) {

			for (var i = 0; i < 8; i++) {
				ip += buffer.slice(i * 2 + 1, i * 2 + 3).toString('hex');
				if (i !== 7) {
					ip += ':';
				}
			}

			if (!net.isIPv6(ip)) {
				ipError = true;
			}

			portFrom = 17;
		}
		else {
			throw new Error('ReadableAdditiveSharingMessage: Malformed address indicator');
		}

		if (ipError) {
			throw new Error('ReadableAdditiveSharingMessage: Malformed IP');
		}

		this._ip = ip;
		this._port = buffer.readUInt16BE(portFrom);

		this._payload = buffer.slice(portFrom + 2);
	}

	public getIp ():string {
		return this._ip;
	}

	public getPayload ():Buffer {
		return this._payload;
	}

	public getPort ():number {
		return this._port;
	}

}

export = ReadableAdditiveSharingMessage;