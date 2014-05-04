import ContactNodeAddressFactoryInterface = require('./interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');
import ContactNodeAddress = require('./ContactNodeAddress');

class ContactNodeAddressFactory implements ContactNodeAddressFactoryInterface {
	public create (ip:string, port:number):ContactNodeAddressInterface {
		return new ContactNodeAddress(ip, port);
	}

	public static createDummy():ContactNodeAddressInterface {
		var getOctet = function():number {
			return Math.round(Math.random()*255);
		};

		var getRandIp =function ():string {
			//generate the ipaddress
			return getOctet()
				+ '.' + getOctet()
				+ '.' + getOctet()
				+ '.' + getOctet();
		};

		return new ContactNodeAddress(getRandIp(), Math.round(Math.random()*100000));
	}
}

export = ContactNodeAddressFactory;