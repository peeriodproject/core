/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/microtime/microtime.d.ts' />

import microtime = require('microtime');

import ContactNodeAddressFactoryInterface = require('./interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressListInterface = require('./interfaces/ContactNodeAddressListInterface');
import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeObjectInterface = require('./interfaces/ContactNodeObjectInterface');
import IdInterface = require('./interfaces/IdInterface');

import ContactNode = require('./ContactNode');
import ContactNodeAddress = require('./ContactNodeAddress');
import ContactNodeAddressFactory = require('./ContactNodeAddressFactory');
import Id = require('./Id');

/**
 * The `ContactNodeFactory` creates {@link core.topology.ContactNode} according to the {@link core.topology.ContactNodeInterface}
 *
 * @class core.topology.ContactNodeFactory
 * @implements core.topology.ContactNodeFactoryInterface
 */
class ContactNodeFactory implements ContactNodeFactoryInterface {

	public create (id:IdInterface, addresses:ContactNodeAddressListInterface, lastSeen?:number):ContactNodeInterface {
		lastSeen = lastSeen || microtime.now();
		return new ContactNode(id, addresses, lastSeen);
	}

	public createFromObject (object:ContactNodeObjectInterface):ContactNodeInterface {
		var addressFactory:ContactNodeAddressFactoryInterface = new ContactNodeAddressFactory();
		var addresses:ContactNodeAddressListInterface = [];

		if (object.addresses && object.addresses.length) {
			for (var i in object.addresses) {
				var address = object.addresses[i];
				addresses.push(addressFactory.create(address._ip, address._port));
			}
		}

		var idBuffer:Buffer = new Buffer(object.id);
		return this.create(new Id(idBuffer, 160), addresses, object.lastSeen);
	}

	public static createDummy (idStr?:string, encoding?:string, ip?:string, port?:number):ContactNodeInterface {
		var getId = function ():IdInterface {
			var getRandomId = function ():string {
				var str = '';

				for (var i = 160; i--;) {
					str += (Math.round(Math.random())).toString();
				}

				return str;
			};

			idStr = idStr || getRandomId();

			var method = (encoding && encoding === 'hex') ? 'byteBufferByHexString' : 'byteBufferByBitString';

			return new Id(Id[method](idStr, 20), 160);
		};

		var getAddresses = function ():ContactNodeAddressListInterface {
			if (!(ip && port)) {
				return [ContactNodeAddressFactory.createDummy()];
			}
			else {
				return [(new ContactNodeAddressFactory()).create(ip, port)];
			}
		};

		/*var getLastSeen = function ():number {
			return microtime.now();
		};*/

		return new ContactNode(getId(), getAddresses(), ContactNodeFactory.getLastSeen());

		/*
		 toString: function () {
		 return JSON.stringify({
		 addresses: this.getAddresses(),
		 id       : this.getId(),
		 lastSeen : this.getLastSeen()
		 });
		 }
		 */
	}

	public static getLastSeen():number {
		return microtime.now();
	}
}

export = ContactNodeFactory;