import FoundClosestNodesReadableMessageFactoryInterface = require('./interfaces/FoundClosestNodesReadableMessageFactoryInterface');
import FoundClosestNodesReadableMessageInterface = require('./interfaces/FoundClosestNodesReadableMessageInterface');
import FoundClosestNodesReadableMessage = require('./FoundClosestNodesReadableMessage');
import ContactNodeFactoryInterface = require('../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeFactory = require('../../../topology/ContactNodeFactory');
import ContactNodeAddressFactoryInterface = require('../../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressFactory = require('../../../topology/ContactNodeAddressFactory');

/**
 * FoundClosestNodesReadableMessageFactoryInterface implementation.
 *
 * @class core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactory
 * @implements core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactoryInterface
 */
class FoundClosestNodesReadableMessageFactory implements FoundClosestNodesReadableMessageFactoryInterface {

	/**
	 * @member {core.protocol.topology.ContactNodeFactoryInterface} core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactory~_nodeFactory
	 */
	_nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * @member {core.protocol.topology.ContactNodeAddressFactoryInterface} core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactory~_addressFactory
	 */
	_addressFactory:ContactNodeAddressFactoryInterface = null;

	constructor () {
		this._nodeFactory = new ContactNodeFactory();
		this._addressFactory = new ContactNodeAddressFactory();
	}

	public create (payload:Buffer):FoundClosestNodesReadableMessageInterface {

		return new FoundClosestNodesReadableMessage(payload, this._nodeFactory, this._addressFactory);
	}
}

export = FoundClosestNodesReadableMessageFactory;