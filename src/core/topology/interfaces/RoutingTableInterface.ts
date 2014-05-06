import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');
import IdInterface = require('./IdInterface');
import ContactNodeInterface = require('./ContactNodeInterface');
import ContactNodeListInterface = require('./ContactNodeListInterface');

/**
 * RoutingTable Interface
 *
 * - creates k buckes
 * - provides a single entry point for contact nodes which should be stored within a bucket.
 *
 * @interface
 * @class core.topology.RoutingTableInterface
 * @extends core.utils.ClosableInterface
 */
interface RoutingTableInterface extends ClosableAsyncInterface {

	/**
	 * Returns the `topology.k` closest nodes to the specified id
	 *
	 * @method core.topology.RoutingTableInterface#getClosestContactNodes
	 *
	 * @param {core.topology.IdInterface} id
	 * @param {core.topology.IdInterface} excludeId
	 * @param {Function} callback(err:Error, contacts:ContactNodeListInterface)
	 */
	getClosestContactNodes (id:IdInterface, excludeId:IdInterface, callback:(err:Error, contacts:ContactNodeListInterface) => any):void;

	/**
	 * Returns the specified contact code by id
	 *
	 * @method core.topology.RoutingTableInterface#getContactNode
	 *
	 * @param {core.topology.IdInterface} id The id of the contact node
	 * @returns {ContactNodeInterface} The found contact node or null
	 */
	getContactNode (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Updates the specified contact node according to the protocol.
	 * This should be the main entry point to the routing table whenever a new peer shows up.
	 *
	 * @method core.topology.RoutingTableInterface#updateContactNode
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	updateContactNode (contact:ContactNodeInterface, callback?:(err:Error) => any):void;

	/**
	 * IDEA: should be called whenever my ip changes
	 *
	 * @param {core.topology.IdInterface} id
	 */
	updateId (id:IdInterface):void;

}

export = RoutingTableInterface;