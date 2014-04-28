/**
 * Created by joernroeder on 4/23/14.
 */

/// <reference path='DistanceMetric.d.ts' />

/**
 * The `ContactNodeInterface` represents a single contact node and is used by the {@link topology.RoutingTableInterface}
 * and {@link topology.BucketInterface} to store informations about other peers.
 *
 * @interface
 * @class topology.ContactNodeInterface
 */
interface ContactNodeInterface {

	/**
	 * Returns the addresses of the contact node.
	 *
	 * @abstract
	 * @method topology.ContactNodeInterface#getAddresses
	 *
	 * @returns {string}
	 */
	getAddresses():string;

	/**
	 * Returns the id of the contact node.
	 *
	 * @abstract
	 * @method topology.ContactNodeInterface#getId
	 *
	 * @returns {topology.DistanceMetric}
	 */
	getId():DistanceMetric;

	/**
	 * Returns the last seen timestamp of the contact node.
	 *
	 * @abstract
	 * @method topology.ContactNodeInterface#getLastSeen
	 *
	 * @returns {number}
	 */
	getLastSeen():number;

	/**
	 * Returns the public key of the contact node.
	 *
	 * @abstract
	 * @method topology.ContactNodeInterface#getPublicKey
	 *
	 * @returns {string}
	 */
	getPublicKey():string;

	updateLastSeen():void;

}