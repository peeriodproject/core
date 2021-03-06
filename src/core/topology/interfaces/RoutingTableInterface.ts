import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');
import IdInterface = require('./IdInterface');
import ContactNodeInterface = require('./ContactNodeInterface');
import ContactNodeListInterface = require('./ContactNodeListInterface');

/**
 * The RoutingTable manages the Buckets where contact nodes are stored.
 * It creates `topology.bitLength` [buckets]{@link core.topology.BucketInterface} and stores incoming contact nodes
 * with the help of {@link core.topology.IdInterface#differsInHighestBit} in the responsible bucket.
 *
 * It also provides a single function to [get contact nodes]{@link core.topology.RoutingTableInterface#getContactNodes}
 * out of the bucket as well as [getting closest nodes]{@link core.topology.RoutingTableInterface#getClosestContactNodes}
 * to a given Id.
 *
 * @interface
 * @class core.topology.RoutingTableInterface
 * @extends core.utils.ClosableAsyncInterface
 */
interface RoutingTableInterface extends ClosableAsyncInterface {

	/**
	 * Returns all contact nodes stored in the routing table sorted by the last seen property
	 *
	 * @method core.topology.RoutingTableInterface#getAllContactNodes
	 *
	 * @param {Function} callback The callback with a possible error as the first and the contact nodes list as the second argument
	 */
	getAllContactNodes (callback:(err:Error, contacts:ContactNodeListInterface) => any):void;

	/**
	 * Returns the total amount of contact nodes stored in the routing table
	 *
	 * @method core.topology.RoutingTableInterface#getAllContactNodesSize
	 *
	 * @param {Function} callback
	 */
	getAllContactNodesSize (callback:(err:Error, count:number) => any):void;

	/**
	 * Returns up to `topology.k` closest contact nodes in sorted order to the specified Id. It will only return less
	 * than `topology.k`contact nodes if no more contact nodes are known and should exclude the given `excludeId` from
	 * the results.
	 *
	 * To speed up the lookup process this method should start at the `responsible bucket` for the given id and walk all
	 * the way down to bucket 0. If not enough contact nodes were found, the search continues at the `responsible bucket + 1`.
	 * From there, the search continues bucket by bucket, and stops as soon as enough contact nodes were found, as we
	 * distance ourselves with each bucket.
	 *
	 * @method core.topology.RoutingTableInterface#getClosestContactNodes
	 *
	 * @param {core.topology.IdInterface} id
	 * @param {core.topology.IdInterface} excludeId
	 * @param {Function} callback(err:Error, contacts:ContactNodeListInterface)
	 */
	getClosestContactNodes (id:IdInterface, excludeId:IdInterface, callback:(err:Error, contacts:ContactNodeListInterface) => any):void;

	/**
	 * Returns the specified contact node by id
	 *
	 * @method core.topology.RoutingTableInterface#getContactNode
	 *
	 * @param {core.topology.IdInterface} id The id of the contact node
	 * @returns {ContactNodeInterface} The found contact node or null
	 */
	getContactNode (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Returns a random contact node
	 *
	 * @method core.topology.RoutingTableInterface#getContactNode
	 *
	 * @param {Function} callback
	 */
	getRandomContactNode (callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Returns `amount` nodes from the bucket with the provided index.
	 * If the bucket holds less than the desired amount, all nodes in the bucket are returned.
	 *
	 * @method core.topology.RoutingTableInterface#getRandomContactNodesFromBucket
	 *
	 * @param {number} bucketKey The key of the bucket from which the contact nodes will be returned.
	 * @param {number} amount The number of desired nodes.
	 * @param {Function} callback Function which gets called when the search has completed, with a possible error and the array of nodes as arguments.
	 */
	getRandomContactNodesFromBucket (bucketKey:number, amount:number, callback:(err:Error, contactNodes:ContactNodeListInterface) => any):void;

	/**
	 * Removes the given contact node and adds the new node to the bucket. It returns an error in the callback if the nodes
	 * are not stored within the same bucket.
	 *
	 * @param {core.topology.ContactNodeInterface} oldContactNode
	 * @param {core.topology.ContactNodeInterface} newContactNode
	 * @param {Function} callback
	 */
	replaceContactNode (oldContactNode:ContactNodeInterface, newContactNode:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void;

	/**
	 * Updates the specified contact node
	 *
	 * @method core.topology.RoutingTableInterface#updateContactNode
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	updateContactNode (contact:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void;

}

export = RoutingTableInterface;