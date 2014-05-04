import ContactNodeAddressInterface = require('./ContactNodeAddressInterface');

interface ContactNodeAddressFactoryInterface {
	create(ip:string, port:number):ContactNodeAddressInterface;
}

export = ContactNodeAddressFactoryInterface;