/**
 * Created by joernroeder on 4/23/14.
 */

/// <reference path='../utils/ClosableInterface.d.ts' />
/// <reference path='DistanceMetric.d.ts' />
/// <reference path='ContactNodeInterface.d.ts' />

/**
 * @interface
 * @class topology.BucketInterface
 * @extends utils.ClosableInterface
 */
interface BucketInterface extends ClosableInterface {

	/**
	 * Adds the specified contact node to the bucket.
	 *
	 * @abstract
	 * @method topology.BucketInterface#add
	 *
	 * @param {topology.ContactNodeInterface} contact
	 */
	add(contact:ContactNodeInterface):boolean;

	/**
	 * Returns `true` if the bucket contains the specified contact node.
	 *
	 * @abstract
	 * @method topology.BucketInterface#contains
	 *
	 * @param {topology.ContactNodeInterface} contact
	 * @returns {boolean}
	 */
	contains(contact:ContactNodeInterface):boolean;

	/**
	 * Returns a contact node by id.
	 *
	 * @abstract
	 * @method topology.BucketInterface#get
	 *
	 * @param {topology.DistanceMetric} id
	 * @returns {any}
	 */
	get(id:DistanceMetric):any;

	/**
	 * Removes a contact node by id
	 *
	 * @abstract
	 * @method topology.BucketInterface#remove
	 *
	 * @param {topology.DistanceMetric} id
	 */
	remove(id:DistanceMetric):boolean;

	/**
	 * Returns the number of contact nodes in the bucket.
	 *
	 * @abstract
	 * @method topology.BucketInterface#size
	 *
	 * @returns {number}
	 */
	size():number;

	/**
	 * Updates the specified contact node according to the protocol logic.
	 *
	 * @abstract
	 * @method topology.BucketInterface#update
	 *
	 * @param {topology.ContactNodeInterface} contact
	 */
	update(contact:ContactNodeInterface):boolean;

}