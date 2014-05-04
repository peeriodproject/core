/// <reference path='../../../ts-definitions/node/node.d.ts' />

import net = require('net');

import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');

class ContactNodeAddress implements ContactNodeAddressInterface {

	private _ip:string = null;
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

	getIp():string {
		return this._ip;
	}

	getPort():number {
		return this._port;
	}

	getAddressAsByteBuffer():Buffer {
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