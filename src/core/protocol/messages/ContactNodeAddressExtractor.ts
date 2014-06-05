/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import MessageByteCheatsheet = require('./MessageByteCheatsheet');
import ContactNodeAddressFactoryInterface = require('../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');

/**
 * Helper class for extracting address blocks from a byte buffer as specified in
 * {@link core.protocol.messages.ReadableMessageInterface}
 *
 * @class core.protocol.message.ContactNodeAddressExtractor
 */
class ContactNodeAddressExtractor {

	/**
	 * Makes a ContactNodeAddress out of a buffer representing an IPv4 address.
	 *
	 * @method core.protocol.messages.ContactNodeAddressExtractor.contactNodeAddressByIPv4Buffer
	 *
	 * @todo From node v.0.11.x (and thus node-webkit v.0.9.x) toJSON() will return a json object with {type:'Buffer',
	 * data:[<bytes>]} and not just the array with bytes!
	 *
	 * @param {Buffer} buffer
	 * @returns {ContactNodeAddressInterface}
	 */
	public static contactNodeAddressByIPv4Buffer (buffer:Buffer, addressFactory:ContactNodeAddressFactoryInterface):ContactNodeAddressInterface {
		var ip:string = buffer.slice(0, 4).toJSON().join('.');
		var port:number = buffer.readUInt16BE(4);

		return addressFactory.create(ip, port);
	}

	/**
	 * Makes a ContactNodeAddress out of a buffer representing an IPv6 address.
	 *
	 * @method core.protocol.messages.ContactNodeAddressExtractor.contactNodeAddressByIPv6Buffer
	 *
	 * @param {Buffer} buffer
	 * @returns {ContactNodeAddressInterface}
	 */
	public static contactNodeAddressByIPv6Buffer (buffer:Buffer, addressFactory:ContactNodeAddressFactoryInterface):ContactNodeAddressInterface {
		var ip:string = '';
		var port:number = buffer.readUInt16BE(16);

		for (var i=0; i<8; i++) {
			ip += buffer.slice(i * 2, i*2 + 2).toString('hex');
			if (i !== 7) {
				ip += ':';
			}
		}

		return addressFactory.create(ip, port);
	}

	/**
	 * Extract addresses from a buffer and return them in an array
	 *
	 * @method core.protocol.messages.ContactNodeAddressExtractor#extractSenderAddressesAndBytesReadAsArray
	 *
	 * @param {Buffer} buffer The buffer to extract from
	 * @param {core.topology.ContactNodeAddressFactoryInterface} addressFactory Address factory to create the addresses with
	 * @param {number} from The index of bytes to start from
	 * @returns {Array} Returns an array with two items: First is the array of addresses, second is the index of the last byte read.
	 */
	public static extractAddressesAndBytesReadAsArray (buffer:Buffer, addressFactory:ContactNodeAddressFactoryInterface, from:number):any {
		var doRead = true;
		var result:ContactNodeAddressListInterface = [];

		while (doRead) {
			var identByte = buffer[from];

			from++;

			if (identByte === MessageByteCheatsheet.ipv4) {
				var bytesToRead = 6;

				result.push(ContactNodeAddressExtractor.contactNodeAddressByIPv4Buffer(buffer.slice(from, from + bytesToRead), addressFactory));
				from += bytesToRead;
			}
			else if (identByte === MessageByteCheatsheet.ipv6) {
				var bytesToRead = 18;

				result.push(ContactNodeAddressExtractor.contactNodeAddressByIPv6Buffer(buffer.slice(from, from + bytesToRead), addressFactory));
				from += bytesToRead;
			}
			else if (identByte === MessageByteCheatsheet.addressEnd) {
				doRead = false;
			}
			else {
				doRead = false;
				throw new Error('ContactNodeAddressExtractor~_extractAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.');
			}
		}

		return [result, from];
	}

}

export = ContactNodeAddressExtractor;