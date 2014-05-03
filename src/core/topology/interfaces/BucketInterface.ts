import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');
import IdInterface = require('./IdInterface');
import ContactNodeInterface = require('./ContactNodeInterface');

/**
 * @interface
 * @class core.topology.BucketInterface
 * @extends core.utils.ClosableInterface
 */
interface BucketInterface extends ClosableAsyncInterface {

	/**
	 * Adds the specified contact node to the bucket.
	 *
	 * @method core.topology.BucketInterface#add
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	add (contact:ContactNodeInterface, callback?:(err:Error) => any):void;

	/**
	 * Returns `true` if the bucket contains the specified contact node.
	 *
	 * @method core.topology.BucketInterface#contains
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 * @returns {boolean}
	 */
	contains (contact:ContactNodeInterface, callback:(err:Error, contains:boolean) => any):void;

	/**
	 * Returns a contact node by id.
	 *
	 * @method core.topology.BucketInterface#get
	 *
	 * @param {core.topology.IdInterface} id
	 * @returns {any}
	 */
	get (id:IdInterface, callback:(err:Error, contact:ContactNodeInterface) => any):void;

	/**
	 * Removes a contact node by id
	 *
	 * @method core.topology.BucketInterface#remove
	 *
	 * @param {core.topology.IdInterface} id
	 */
	remove (id:IdInterface, callback?:(err:Error) => any):void;

	/**
	 * Returns the number of contact nodes in the bucket.
	 *
	 * @method core.topology.BucketInterface#size
	 *
	 * @returns {number}
	 */
	size (callback:(err:Error, size:number) => any):void;

	/**
	 * Updates specified contact node.
	 *
	 * @method core.topology.BucketInterface#update
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	update (contact:ContactNodeInterface, callback?:(err:Error) => any):void;

}

export = BucketInterface;