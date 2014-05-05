import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');

/**
 * @class core.topology.ContactNodeAddress
 * @implements core.topology.ContactNodeAddressInterface
 */
class ContactNodeAddress implements ContactNodeAddressInterface {

	/**
	 * Holds the ip address
	 *
	 * @member {string} core.topology.ContactNodeAddress~_ip
	 */
	_ip:string = '';

	/**
	 * Holds the port number
	 *
	 * @member {number} core.topology.ContactNodeAddress~_number
	 */
	_port:number = 0;

	// todo check if the ip string is a valid ip format and throw an error otherwise
	constructor (ip:string, port:number) {
		this._ip = ip;
		this._port = port;
	}

	getIp ():string {
		return this._ip;
	}

	getPort ():number {
		return this._port;
	}

}

export = ContactNodeAddress;