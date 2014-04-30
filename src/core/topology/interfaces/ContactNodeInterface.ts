import IdInterface = require('./IdInterface');

/**
 * The `ContactNodeInterface` represents a single contact node and is used by the {@link core.topology.RoutingTableInterface}
 * and {@link core.topology.BucketInterface} to store informations about other peers.
 *
 * @interface
 * @class core.topology.ContactNodeInterface
 */
interface ContactNodeInterface {

	/**
	 * Returns the addresses of the contact node.
	 *
	 * @abstract
	 * @method core.topology.ContactNodeInterface#getAddresses
	 *
	 * @returns {string}
	 */
	getAddresses ():string;

	/**
	 * Returns the id of the contact node.
	 *
	 * @abstract
	 * @method core.topology.ContactNodeInterface#getId
	 *
	 * @returns {core.topology.IdInterface}
	 */
	getId ():IdInterface;

	/**
	 * Returns the last seen timestamp of the contact node.
	 *
	 * @abstract
	 * @method core.topology.ContactNodeInterface#getLastSeen
	 *
	 * @returns {number}
	 */
	getLastSeen ():number;

	/**
	 * Returns the public key of the contact node.
	 *
	 * @abstract
	 * @method core.topology.ContactNodeInterface#getPublicKey
	 *
	 * @returns {string}
	 */
	getPublicKey ():string;

	updateLastSeen ():void;

}

export = ContactNodeInterface;