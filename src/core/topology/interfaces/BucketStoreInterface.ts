/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import ClosableInterface = require('../../utils/interfaces/ClosableInterface');
import ContactNodeObjectInterface = require('./ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('./ContactNodeObjectListInterface');

/**
 * A low-level interface which creates a unified api for different bucket stores.
 *
 * @interface
 * @class core.topology.BucketStoreInterface
 * @extends core.utils.ClosableInterface
 */
interface BucketStoreInterface extends ClosableInterface {

	/**
	 * Adds a object to the bucket store.
	 *
	 * @method core.topology.BucketStoreInterface#add
	 *
	 * @param {string} bucketKey
	 * @param {Buffer} id
	 * @param {number} lastSeen
	 * @param {any} addresses
	 */
	add (bucketKey:string, id:Buffer, lastSeen:number, addresses:any):boolean;

	/**
	 * Adds multiple objects to the bucket store.
	 *
	 * @see core.topology.BucketStoreInterface#add
	 *
	 * @method core.topology.BucketStoreInterface#addAll
	 *
	 * @param {string} bucketKey
	 * @param contacts
	 */
	addAll (bucketKey:string, contacts:any):boolean;

	/**
	 * Returns `true` if the specified bucket constains the id.
	 *
	 * @method core.topology.BucketStoreInterface#contains
	 *
	 * @param {String} bucketKey
	 * @param {Buffer} id
	 *
	 * @return {boolean}
	 */
	contains (bucketKey:string, id:Buffer):boolean;

	/**
	 * Returns the object stored for the specified bucket/id combination as JSON-Object with sorted keys.
	 *
	 * todo json example
	 * todo specify return value type
	 *
	 * @method core.topology.BucketStoreInterface#get
	 *
	 * @param {string} bucketKey
	 * @param {Buffer} id
	 *
	 * @returns {any}
	 */
	get (bucketKey:string, id:Buffer):ContactNodeObjectInterface;

	/**
	 * Returns all objects stored under the specified bucketKey
	 *
	 * todo specify return value type
	 *
	 * @param {string} bucketKey
	 * @returns {any}
	 */
	getAll (bucketKey:string):ContactNodeObjectListInterface;


	/**
	 * Removes the specified bucket/id combination from the store.
	 * 
	 * @method core.topology.BucketStoreInterface#remove
	 *
	 * @param {string} bucketKey
	 * @param {Buffer} id
	 */
	remove (bucketKey:string, id:Buffer):boolean;

	/**
	 * Returns the size of the specified bucket.
	 *
	 * @method core.topology.BucketStoreInterface#size
	 *
	 * @param {string} bucketKey
	 * @returns {number}
	 */
	size (bucketKey:string):number;

}

export = BucketStoreInterface;