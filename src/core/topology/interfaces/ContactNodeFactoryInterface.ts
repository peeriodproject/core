import ContactNodeInterface = require('./ContactNodeInterface');
import IdInterface = require('./IdInterface');

interface ContactNodeFactoryInterface {
	create(id:IdInterface, addresses:any, lastSeen:number, publicKey:any):ContactNodeInterface;
}

export = ContactNodeFactoryInterface;