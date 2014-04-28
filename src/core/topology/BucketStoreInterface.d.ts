/**
 * Created by joernroeder on 4/23/14.
 */

/// <reference path='../utils/ClosableInterface.d.ts' />
/// <reference path='DistanceMetric.d.ts' />

/**
 * A low-level interface which creates a unified api for different bucket stores.
 *
 * @interface
 * @class topology.BucketStoreInterface
 * @extends utils.ClosableInterface
 */
interface BucketStoreInterface extends ClosableInterface {

	/**
	 * Adds a object to the bucket store.
	 *
	 * @abstract
	 * @method topology.BucketStoreInterface#add
	 *
	 * @param {string} bucketKey
	 * @param {topology.DistanceMetric} id
	 * @param {number} lastSeen
	 * @param {any} addresses
	 * @param {string} publicKey
	 */
	add(bucketKey:string, id:DistanceMetric, lastSeen:number, addresses:any, publicKey:string):boolean;

	/**
	 * Returns `true` if the specified bucket constains the id.
	 *
	 * @abstract
	 * @method topology.BucketStoreInterface#contains
	 *
	 * @param {String} bucketKey
	 * @param {topology.DistanceMetric} id
	 *
	 * @return {boolean}
	 */
	contains(bucketKey:string, id:DistanceMetric):boolean;

	/**
	 * Debug method
	 *
	 * @abstract
	 * @method topology.BucketStoreInterface#debug
	 */
	debug():void;

	/**
	 * Returns the object stored for the specified bucket/id combination.
	 *
	 * @abstract
	 * @method topology.BucketStoreInterface#get
	 *
	 * @param {string} bucketKey
	 * @param {topology.DistanceMetric} id
	 *
	 * @returns {any}
	 */
	get(bucketKey:string, id:DistanceMetric):any;

	/**
	 * Removes the specified bucket/id combination from the store.
	 *
	 * @abstract
	 * @method topology.BucketStoreInterface#remove
	 *
	 * @param {string} bucketKey
	 * @param {topology.DistanceMetric} id
	 */
	remove(bucketKey:string, id:DistanceMetric):boolean;

	/**
	 * Returns the size of the specified bucket.
	 *
	 * @abstract
	 * @method topology.BucketStoreInterface#size
	 *
	 * @param {string} bucketKey
	 * @returns {number}
	 */
	size(bucketKey:string):number;

}