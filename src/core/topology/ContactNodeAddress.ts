/// <reference path='../../../ts-definitions/node/node.d.ts' />

import net = require('net');

import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');

/**
 * @class core.topology.ContactNodeAddress
 * @implements core.topology.ContactNodeAddressInterface
 *
 * @param {string} ip IPv4 or IPv6 address as string representation.
 * @param {number} port The port number.
 */
class ContactNodeAddress implements ContactNodeAddressInterface {

	/**
	 * Holds the ip address
	 *
	 * @member {string} core.topology.ContactNodeAddress~_ip
	 */
	private _ip:string = '';

	/**
	 * Holds the port number
	 *
	 * @member {number} core.topology.ContactNodeAddress~_number
	 */
	private _port:number = 0;

	private _isV4 = false;
	private _isV6 = false;

	constructor(ip:string, port:number) {
		if (net.isIPv4(ip)) {
			this._isV4 = true;
		}
		else if (net.isIPv6(ip)) {
			this._isV6 = true;
		}

		if (!(this._isV4 || this._isV6)) {
			throw new Error('ContactNodeAddress.constructor: Provided IP is neither of IPv4 nor IPv6 format.');
		}

		this._ip = ip;
		this._port = port;
	}

	public getIp ():string {
		return this._ip;
	}

	public getPort ():number {
		return this._port;
	}

	/**
	 * Represents the IP address and Port number as a bytes.
	 * 4 Bytes for IPv4 addresses.
	 * 16 Bytes for IPv6 addresses.
	 * 2 Bytes for the port number.
	 *
	 * @returns {Buffer}
	 */
	public getAddressAsByteBuffer():Buffer {
		var buf = null;
		if (this._isV4) {
			buf = new Buffer(6);
			buf.fill(0);
			var ipArray = this._ip.split('.');
			for (var i=0; i < 4; i++) {
				buf.writeUInt8(parseInt(ipArray[i], 10), i);
			}
		}
		else if (this._isV6) {
			buf = new Buffer(18);
			buf.fill(0);

			var getIndividualHexStrings = function (part:string):Array<string> {
				var ret = part.split(':');
				for (var i=0; i<ret.length; i++) {
					var l = 4 - ret[i].length;
					for (var j=0; j< l; j++) {
						ret[i] = '0' + ret[i];
					}
				}

				return ret;
			}

			var nonZero = this._ip.split('::');
			var individualHex1:Array<string> = getIndividualHexStrings(nonZero[0]);
			for (var i=0; i<individualHex1.length; i++) {
				buf.write(individualHex1[i], i*2, 2, 'hex');
			}

			if (nonZero[1]) {

				var individualHex2:Array<string> = getIndividualHexStrings(nonZero[1]);
				var bytesToSkip = 16 - individualHex2.length * 2;
				for (var i=0; i<individualHex2.length; i++) {
					buf.write(individualHex2[i], bytesToSkip + i*2, 2, 'hex');
				}
			}

		}
		buf.writeUInt16BE(this._port, buf.length - 2);

		return buf;
	}

}

export = ContactNodeAddress;