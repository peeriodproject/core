import ContactNodeInterface = require('./ContactNodeInterface');
import ContactNodeAddressInterface = require('./ContactNodeAddressInterface');
import IdInterface = require('./IdInterface');

interface ContactNodeFactoryInterface {
	create(id:IdInterface, addresses:Array<ContactNodeAddressInterface>, lastSeen:number):ContactNodeInterface;
}

export = ContactNodeFactoryInterface;