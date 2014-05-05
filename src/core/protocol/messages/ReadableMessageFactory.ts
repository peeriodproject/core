import ContactNodeAddressFactoryInterface = require('../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeFactoryInterface = require('../../topology/interfaces/ContactNodeFactoryInterface');
import ReadableMessageFactoryInterface = require('./interfaces/ReadableMessageFactoryInterface');
import ReadableMessageInterface = require('./interfaces/ReadableMessageInterface');

import ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');
import ContactNodeFactory = require('../../topology/ContactNodeFactory');
import ReadableMessage = require('./ReadableMessage');

/**
 * @class core.protocol.messages.ReadableMessageFactory
 * @implements core.protocol.messages.ReadableMessageFactoryInterface
 */
class ReadableMessageFactory implements ReadableMessageFactoryInterface {

	/**
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessageFactory~_nodeFactory
	 */
	private _nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.messages.ReadableMessageFactory~_addressFactory
	 */
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	constructor () {
		this._nodeFactory = new ContactNodeFactory();
		this._addressFactory = new ContactNodeAddressFactory();
	}

	create (buffer:NodeBuffer):ReadableMessageInterface {
		return new ReadableMessage(buffer, this._nodeFactory, this._addressFactory);
	}

}

export = ReadableMessageFactory;