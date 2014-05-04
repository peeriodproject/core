import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');

class ContactNodeAddress implements ContactNodeAddressInterface {

	_ip:string = null;
	_port:number = 0;

	constructor(ip:string, port:number) {
		this._ip = ip;
		this._port = port;
	}

	getIp():string {
		return this._ip;
	}

	getPort():number {
		return this._port;
	}
}

export = ContactNodeAddress;