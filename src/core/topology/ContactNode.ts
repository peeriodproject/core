import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeAddressInterface = require('./interfaces/ContactNodeAddressInterface');
import IdInterface = require('./interfaces/IdInterface');

class ContactNode implements ContactNodeInterface {

	private _id:IdInterface = null;
	private _addresses:Array<ContactNodeAddressInterface> = null;
	private _lastSeen:number = 0;

	constructor (id:IdInterface, addresses:Array<ContactNodeAddressInterface>, lastSeen:number) {
		this._id = id;
		this._addresses = addresses;
		this._lastSeen = lastSeen;
	}

	public getId():IdInterface {
		return this._id;
	}

	public getAddresses():Array<ContactNodeAddressInterface> {
		return this._addresses;
	}

	public getLastSeen():number {
		return this._lastSeen;
	}
}

export = ContactNode;