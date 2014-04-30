import ClosableInterface = require('../../utils/interfaces/ClosableInterface');
import IdInterface = require('./IdInterface');
import ContactNodeInterface = require('./ContactNodeInterface');

/**
 * @interface
 * @class core.topology.BucketInterface
 * @extends core.utils.ClosableInterface
 */
interface BucketInterface extends ClosableInterface {

	/**
	 * Adds the specified contact node to the bucket.
	 *
	 * @method core.topology.BucketInterface#add
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	add (contact:ContactNodeInterface):boolean;

	/**
	 * Returns `true` if the bucket contains the specified contact node.
	 *
	 * @method core.topology.BucketInterface#contains
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 * @returns {boolean}
	 */
	contains (contact:ContactNodeInterface):boolean;

	/**
	 * Returns a contact node by id.
	 *
	 * @method core.topology.BucketInterface#get
	 *
	 * @param {core.topology.IdInterface} id
	 * @returns {any}
	 */
	get (id:IdInterface):any;

	/**
	 * Removes a contact node by id
	 *
	 * @method core.topology.BucketInterface#remove
	 *
	 * @param {core.topology.IdInterface} id
	 */
	remove (id:IdInterface):boolean;

	/**
	 * Returns the number of contact nodes in the bucket.
	 *
	 * @method core.topology.BucketInterface#size
	 *
	 * @returns {number}
	 */
	size ():number;

	/**
	 * Updates the specified contact node according to the protocol logic.
	 *
	 * @method core.topology.BucketInterface#update
	 *
	 * @param {core.topology.ContactNodeInterface} contact
	 */
	update (contact:ContactNodeInterface):boolean;

}

export = BucketInterface;