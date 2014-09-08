import ContactNodeInterface = require('./ContactNodeInterface');
import ContactNodeAddressListInterface = require('./ContactNodeAddressListInterface');
import IdInterface = require('./IdInterface');

/**
 * MyNodeInterface is the object holding all information about the user's node. Differences to
 * {@link core.topology.ContactNodeInterface} include:
 * - no `lastSeen` property
 * - ability to change the address list
 *
 * Furthermore functions can be hooked to MyNode, which will be called as soon as the addresses change.
 *
 * @interface
 * @class core.topology.MyNodeInterface
 */
interface MyNodeInterface {

	/**
	 * Returns the addresses of the node.
	 *
	 * @method core.topology.MyNodeInterface#getAddresses
	 *
	 * @returns {core.topology.ContactNodeAddressListInterface}
	 */
	getAddresses ():ContactNodeAddressListInterface;

	/**
	 * Returns the id of the node.
	 *
	 * @method core.topology.MyNodeInterface#getId
	 *
	 * @returns {core.topology.IdInterface}
	 */
	getId ():IdInterface;

	/**
	 * Hook a function to the class which will get called everytime the addresses change.
	 *
	 * @method core.topology.MyNodeInterface#onAddressChange
	 *
	 * @param {Function} callback
	 */
	onAddressChange (callback:(emitInfo?:string) => any):void;

	/**
	 * Remove a function from the `addressChange` hook.
	 *
	 * @param {Function) callback Function to unbind.
	 */
	removeOnAddressChange (callback:Function):void;

	/**
	 * Updates the addresses of the node.
	 *
	 * @method core.topology.MyNodeInterface#updateAddresses
	 *
	 * @param {core.topology.ContactNodeAddressListInterface} addressList
	 * @param {string} emitInfo Optional additional info stromg that will be passed in to the `address` change event
	 */
	updateAddresses (addressList:ContactNodeAddressListInterface, emitInfo?:string):void;

}

export = MyNodeInterface;