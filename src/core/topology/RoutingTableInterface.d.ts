/**
 * Created by joernroeder on 4/24/14.
 */

/// <reference path='../utils/ClosableInterface.d.ts' />
/// <reference path='DistanceMetric.d.ts' />
/// <reference path='ContactNodeInterface.d.ts' />

/**
 * @interface
 * @class topology.RoutingTableInterface
 * @extends utils.ClosableInterface
 */
interface RoutingTableInterface extends ClosableInterface {

	getContactNode(id:DistanceMetric):any;

	/**
	 * Updates the specified contact node according to the protocol.
	 * This should be the main entry point to the routing table whenever a new peer shows up.
	 *
	 * @abstract
	 * @method topology.RoutingTableInterface#updateContactNode
	 *
	 * @param {topology.ContactNodeInterface} contact
	 */
	updateContactNode(contact:ContactNodeInterface):void;

	updateLastSeen(contact:ContactNodeInterface):void;

	/**
	 * IDEA: should be called whenever my ip changes
	 *
	 * @param {topology.DistanceMetric} id
	 */
	updateId(id:DistanceMetric):void;

}