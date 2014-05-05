import ContactNodeInterface = require('./interfaces/ContactNodeInterface');
import ContactNodeAddressListInterface = require('./interfaces/ContactNodeAddressListInterface');
import IdInterface = require('./interfaces/IdInterface');

/**
 * @class core.topology.ContactNode
 * @implements core.topology.ContactNodeInterface
 *
 * @param {core.topology.IdInterface} id The id of the contact node
 * @param {core.topology.ContactNodeAddressListInterface} addresses The addresses of the contact node
 * @param {number} lastSeen The timestamp at which the contact node was last seen
 */
class ContactNode implements ContactNodeInterface {

	/**
	 * The addresses of the contact node
	 *
	 * @member {core.topology.ContactNodeAddressListInterface} core.topology.ContactNode~_addresses
	 */
	private _addresses:ContactNodeAddressListInterface = null;

	/**
	 * The Id of the contact node
	 *
	 * @member {core.topology.IdInterface} core.topology.ContactNode~_id
	 */
	private _id:IdInterface = null;

	/**
	 * A timestamp at which the contact node was last seen
	 *
	 * @member {number} core.topology.ContactNode~_lastSeen
	 */
	private _lastSeen:number = 0;

	constructor (id:IdInterface, addresses:ContactNodeAddressListInterface, lastSeen:number) {
		this._id = id;
		this._addresses = addresses;
		this._lastSeen = lastSeen;
	}

	public getAddresses():ContactNodeAddressListInterface {
		return this._addresses;
	}

	public getId():IdInterface {
		return this._id;
	}

	public getLastSeen():number {
		return this._lastSeen;
	}

}

export = ContactNode;