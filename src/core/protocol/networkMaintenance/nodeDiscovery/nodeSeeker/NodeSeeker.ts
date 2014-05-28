/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeFactoryInterface = require('../../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeAddressFactoryInterface = require('../../../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import IdInterface = require('../../../../topology/interfaces/IdInterface');
import Id = require('../../../../topology/Id');
import ContactNodeAddressListInterface = require('../../../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../../../topology/interfaces/ContactNodeAddressInterface');

/**
 * @class core.protocol.nodeDiscovery.NodeSeeker
 */
class NodeSeeker {

	private _contactNodeFactory:ContactNodeFactoryInterface = null;
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	setNodeFactory (factory:ContactNodeFactoryInterface) {
		this._contactNodeFactory = factory;
	}

	setAddressFactory (factory:ContactNodeAddressFactoryInterface) {
		this._addressFactory = factory;
	}

	getNodeFactory ():ContactNodeFactoryInterface {
		return this._contactNodeFactory;
	}

	getAddressFactory ():ContactNodeAddressFactoryInterface {
		return this._addressFactory;
	}

	public nodeFromJSON (obj:any):ContactNodeInterface {
		var id:IdInterface = new Id(Id.byteBufferByHexString(obj.id, 20), 160);
		var addresses:ContactNodeAddressListInterface = [];

		if (!obj.addresses.length) {
			throw new Error('NodeSeeker#nodeFromJSON: Addresses may not be empty for a valid node.');
		}

		for (var i=0; i<obj.addresses.length; i++) {
			addresses.push(this.getAddressFactory().create(obj.addresses[i].ip, obj.addresses[i].port));
		}

		return this.getNodeFactory().create(id, addresses);
	}

}

export = NodeSeeker;