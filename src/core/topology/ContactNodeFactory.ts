/// <reference path='../../../ts-definitions/node/node.d.ts' />

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
		lastSeen = lastSeen || Date.now();
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

	public static createDummy ():ContactNodeInterface {
		var getId = function ():IdInterface {
			var getRandomId = function ():string {
				var str = '';

				for (var i = 160; i--;) {
					str += (Math.round(Math.random())).toString();
				}

				return str;
			};

			return new Id(Id.byteBufferByBitString(getRandomId(), 20), 160);
		};

		var getAddresses =  function ():ContactNodeAddressListInterface {
			return [ContactNodeAddressFactory.createDummy()];
		};

		var getLastSeen =  function ():number {
			// node js is too fast for javascripts millis
			var lastSeen = Math.round(Date.now() * Math.random()) + '';

			if (lastSeen.length > 10 ) {
				lastSeen = lastSeen.substr(0, 9);
			}

			return parseInt(lastSeen, 10);
		};

		return new ContactNode(getId(), getAddresses(), getLastSeen());

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
}

export = ContactNodeFactory;