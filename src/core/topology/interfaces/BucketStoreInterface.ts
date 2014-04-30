import ClosableInterface = require('../../utils/interfaces/ClosableInterface');
import IdInterface = require('./IdInterface');

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
	 * todo Typescript: propper return type (callback vs return)
	 *
	 * @method core.topology.BucketStoreInterface#add
	 *
	 * @param {string} bucketKey
	 * @param {core.topology.IdInterface} id
	 * @param {number} lastSeen
	 * @param {any} addresses
	 * @param {string} publicKey
	 */
	add (bucketKey:string, id:IdInterface, lastSeen:number, addresses:any, publicKey:string):boolean;

	/**
	 * Adds multiple objects to the bucket store.
	 *
	 * todo Typescript: propper return type (callback vs return)
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
	 * @param {core.topology.IdInterface} id
	 *
	 * @return {boolean}
	 */
	contains (bucketKey:string, id:IdInterface):boolean;

	/**
	 * Debug method
	 *
	 * @method core.topology.BucketStoreInterface#debug
	 */
	debug ():void;

	/**
	 * Returns the object stored for the specified bucket/id combination as JSON-Object with sorted keys.
	 *
	 * todo json example
	 * todo Typescript: propper return type (callback vs return)
	 *
	 * @method core.topology.BucketStoreInterface#get
	 *
	 * @param {string} bucketKey
	 * @param {core.topology.IdInterface} id
	 *
	 * @returns {any}
	 */
	get (bucketKey:string, id:IdInterface):any;

	/**
	 * Removes the specified bucket/id combination from the store.
	 *
	 * todo Typescript: propper return type (callback vs return)
	 * 
	 * @method core.topology.BucketStoreInterface#remove
	 *
	 * @param {string} bucketKey
	 * @param {core.topology.IdInterface} id
	 */
	remove (bucketKey:string, id:IdInterface):boolean;

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