import ContactNodeAddressFactoryInterface = require('../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeFactoryInterface = require('../../topology/interfaces/ContactNodeFactoryInterface');
import ReadableMessageFactoryInterface = require('./interfaces/ReadableMessageFactoryInterface');
import ReadableMessageInterface = require('./interfaces/ReadableMessageInterface');

import ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('../../topology/ContactNodeFactory');
import ReadableMessage = require('./ReadableMessage');

/**
 * ReadableMessageFactoryInterface implementation.
 *
 * @class core.protocol.messages.ReadableMessageFactory
 * @implements core.protocol.messages.ReadableMessageFactoryInterface
 */
class ReadableMessageFactory implements ReadableMessageFactoryInterface {

	/**
	 * A ContactNodeFactory which gets passed to all ReadableMessages.
	 *
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessageFactory~_nodeFactory
	 */
	private _nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * A ContractNodeAddressFactory which gets passed to all ReadableMessages.
	 *
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.messages.ReadableMessageFactory~_addressFactory
	 */
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	constructor () {
		this._nodeFactory = new ContactNodeFactory();
		this._addressFactory = new ContactNodeAddressFactory();
	}

	public create (buffer:NodeBuffer):ReadableMessageInterface {
		return new ReadableMessage(buffer, this._nodeFactory, this._addressFactory);
	}

}

export = ReadableMessageFactory;