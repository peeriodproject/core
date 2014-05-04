import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNode = require('./ContactNode');
import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');
import IdInterface = require('./interfaces/IdInterface');
import Id = require('./Id');
import ContactNodeAddressFactory = require('./ContactNodeAddressFactory');

class ContactNodeFactory implements ContactNodeFactoryInterface {

	public create(id:IdInterface, addresses:Array<ContactNodeAddressInterface>):ContactNodeInterface {
		return new ContactNode(id, addresses, Date.now());
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

		var getAddresses =  function ():Array<ContactNodeAddressInterface> {
			return [ContactNodeAddressFactory.createDummy()];
		};

		var getLastSeen =  function ():number {
			// node js is too fast for javascripts millis
			return Math.round(Date.now() * Math.random());
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