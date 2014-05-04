import ContactNodeAddressFactoryInterface = require('./interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');
import ContactNodeAddress = require('./ContactNodeAddress');

class ContactNodeAddressFactory implements ContactNodeAddressFactoryInterface {
	create (ip:string, port:number):ContactNodeAddressInterface {
		return new ContactNodeAddress(ip, port);
	}
}

export = ContactNodeAddressFactory;