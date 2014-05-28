/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeFactoryInterface = require('../../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeAddressFactoryInterface = require('../../../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import IdInterface = require('../../../../topology/interfaces/IdInterface');
import Id = require('../../../../topology/Id');
import ContactNodeAddressListInterface = require('../../../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../../../topology/interfaces/ContactNodeAddressInterface');

/**
 * The NodeSeeker class is a helper class from which other seeker classes can be extended from, offering a JSON-to-node
 * conversion and the construction of addresses/nodes via provided factories.
 *
 * @class core.protocol.nodeDiscovery.NodeSeeker
 */
class NodeSeeker {

	/**
	 * A contact node address factory.
	 *
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.nodeDiscovery.NodeSeeker~_addressFactory
	 */
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	/**
	 * A contact node factory.
	 *
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.nodeDiscovery.NodeSeeker~_nodeFactory
	 */
	private _contactNodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * Getter for the address factory.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeeker#getAddressFactory
	 *
	 * @returns core.topology.ContactNodeAddressFactoryInterface
	 */
	public getAddressFactory ():ContactNodeAddressFactoryInterface {
		return this._addressFactory;
	}

	/**
	 * Getter for the node factory.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeeker#getNodeFactory
	 *
	 * @returns core.topology.ContactNodeFactoryInterface
	 */
	public getNodeFactory ():ContactNodeFactoryInterface {
		return this._contactNodeFactory;
	}

	/**
	 * Tries to create a contact node from a JSON object.
	 * The JSON object must look like the following:
	 * {
	 *   'id' : a hex string representation of the node's id
	 *   'addresses': an array of {ip:string, port:number}-objects
	 * }
	 *
	 * Throws errors on problems.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeeker#nodeFromJSON
	 *
	 * @param {Object} obj A JSON object
	 * @returns {core.topology.ContactNodeInterface} The resulting contact node (if successful)
	 */
	public nodeFromJSON (obj:any):ContactNodeInterface {
		var id:IdInterface = new Id(Id.byteBufferByHexString(obj.id, 20), 160);
		var addresses:ContactNodeAddressListInterface = [];

		if (!obj.addresses.length) {
			throw new Error('NodeSeeker#nodeFromJSON: Addresses may not be empty for a valid node.');
		}

		for (var i = 0; i < obj.addresses.length; i++) {
			addresses.push(this.getAddressFactory().create(obj.addresses[i].ip, obj.addresses[i].port));
		}

		return this.getNodeFactory().create(id, addresses);
	}

	/**
	 * Setter for the address factory.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeeker#setAddressFactory
	 *
	 * @param {core.topology.ContactNodeAddressFactoryInterface} factory
	 */
	public setAddressFactory (factory:ContactNodeAddressFactoryInterface) {
		this._addressFactory = factory;
	}

	/**
	 * Setter for the node factory.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeeker#setNodeFactory
	 *
	 * @param {core.topology.ContactNodeFactoryInterface} factory
	 */
	public setNodeFactory (factory:ContactNodeFactoryInterface) {
		this._contactNodeFactory = factory;
	}

}

export = NodeSeeker;