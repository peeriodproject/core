import ContactNodeInterface = require('./ContactNodeInterface');
import IdInterface = require('./IdInterface');

interface ContactNodeFactoryInterface {
	create(id:IdInterface, addresses:any, lastSeen:number):ContactNodeInterface;
}

export = ContactNodeFactoryInterface;