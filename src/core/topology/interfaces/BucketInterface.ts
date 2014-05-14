import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');
import ContactNodeInterface = require('./ContactNodeInterface');
import ContactNodeListInterface = require('./ContactNodeListInterface');
import IdInterface = require('./IdInterface');

/**
 * @interface
 * @class core.topology.BucketInterface
 * @extends core.utils.ClosableInterface
 */
interface BucketInterface extends ClosableAsyncInterface {

	/**
	 * Adds the specified contact node to the bucket. It returns an error in the callback if the bucket is already full.
	 * In addition to the error the callback contains the contact node which was not seen for the longest time in the bucket.
	 *
	 * @method core.topology.BucketInterface#add
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 * @param {Function} callback
	 *
	 */
	add (contact:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void;

	/**
	 * Returns `true` if the bucket contains the specified contact node.
	 *
	 * @method core.topology.BucketInterface#contains
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 * @param {Function} callback
	 */
	contains (contact:ContactNodeInterface, callback:(err:Error, contains:boolean) => any):void;

	/**
	 * Returns a contact node by id.
	 *
	 * @method core.topology.BucketInterface#get
	 *
	 * @param {core.topology.IdInterface} id
	 * @param {Function} callback
	 */
	get (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Returns all contacts from the bucket sorted by the last seen property.
	 *
	 * @method core.topology.BucketInterface#get
	 *
	 * @param callback
	 */
	getAll (callback:(err:Error, contacts:ContactNodeListInterface) => any):void;

	/**
	 * Returns the last seen contact node.
	 *
	 * @method core.topology.BucketInterface#getLongestNotSeen
	 *
	 * @param {Function} callback
	 */
	getLongestNotSeen (callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Returns a random contact node
	 *
	 * @method core.topology.BucketInterface#getRandom
	 *
	 * @param callback
	 */
	getRandom (callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Removes a contact node by id
	 *
	 * @method core.topology.BucketInterface#remove
	 *
	 * @param {core.topology.IdInterface} id
	 * @param {Function} callback
	 */
	remove (id:IdInterface, callback?:(err:Error) => any):void;

	/**
	 * Returns the number of contact nodes in the bucket.
	 *
	 * @method core.topology.BucketInterface#size
	 *
	 * @param {Function} callback
	 */
	size (callback:(err:Error, size:number) => any):void;

	/**
	 * Updates specified contact node and returns an error if the bucket is already full. In addition to the error the
	 * callback contains the contact node which was not seen for the longest time in the bucket.
	 *
	 * @method core.topology.BucketInterface#update
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 * @param {Function} callback
	 */
	update (contact:ContactNodeInterface, callback?:(err:Error, longestNotSeenContact:ContactNodeInterface) => any):void;

}

export = BucketInterface;