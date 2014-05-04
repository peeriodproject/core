import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNode = require('./ContactNode');
import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');
import IdInterface = require('./interfaces/IdInterface');
import Id = require('./Id');

class ContactNodeFactory implements ContactNodeFactoryInterface {

	public create(id:IdInterface, addresses:Array<ContactNodeAddressInterface>):ContactNodeInterface {
		return new ContactNode(id, addresses, Date.now());
	}

	public static createDummy ():ContactNodeInterface {
		// dummy contact node generator
		var max = 160;

		var getRandomId = function ():string {
			var str = '';

			for (var i = max; i--;) {
				str += (Math.round(Math.random())).toString();
			}

			return str;
		};
		var id = getRandomId();
		// node js is too fast for javascripts millis
		var lastSeen = Math.round(Date.now() * Math.random());

		return {
			getId: function ():IdInterface {
				return new Id(Id.byteBufferByBitString(id, 20), max);
			},

			getAddresses: function ():string {
				return "[{ip: '123', port: 80}, {ip: '456', port: 80}]";
			},

			getLastSeen: function ():number {
				return lastSeen;
			},

			updateLastSeen: function ():void {
				lastSeen = Date.now();
			},

			toString: function () {
				return JSON.stringify({
					addresses: this.getAddresses(),
					id       : this.getId(),
					lastSeen : this.getLastSeen(),
					publicKey: this.getPublicKey()
				});
			}
		};
	}
}

export = ContactNodeFactory;