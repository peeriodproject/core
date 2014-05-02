import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import IdInterface = require('./interfaces/IdInterface');
import Id = require('./Id');

class ContactNodeFactory implements ContactNodeFactoryInterface {
	public static createDummy ():ContactNodeInterface {
		// dummy contact node generator
		var max = 48;

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
				return new Id(Id.byteBufferByBitString(id, 6), max);
			},

			getPublicKey: function ():string {
				return 'pk-123456';
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