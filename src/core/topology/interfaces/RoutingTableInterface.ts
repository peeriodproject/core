import ClosableInterface = require('../../utils/interfaces/ClosableInterface');
import IdInterface = require('./IdInterface');
import ContactNodeInterface = require('./ContactNodeInterface');

/**
 * @interface
 * @class core.topology.RoutingTableInterface
 * @extends core.utils.ClosableInterface
 */
interface RoutingTableInterface extends ClosableInterface {

	/**
	 * Returns the specified contact code by id
	 *
	 * @param {core.topology.IdInterface} id The id of the contact node
	 * @returns {ContactNodeInterface} The found contact node or null
	 */
	getContactNode(id:IdInterface):ContactNodeInterface;

	/**
	 * Updates the specified contact node according to the protocol.
	 * This should be the main entry point to the routing table whenever a new peer shows up.
	 *
	 * @method core.topology.RoutingTableInterface#updateContactNode
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	updateContactNode(contact:ContactNodeInterface):void;

	/**
	 * IDEA: should be called whenever my ip changes
	 *
	 * @param {core.topology.IdInterface} id
	 */
	updateId(id:IdInterface):void;

}

export = RoutingTableInterface;