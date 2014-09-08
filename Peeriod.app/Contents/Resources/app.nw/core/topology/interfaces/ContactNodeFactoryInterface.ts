import ContactNodeAddressListInterface = require('./ContactNodeAddressListInterface');
import ContactNodeInterface = require('./ContactNodeInterface');
import ContactNodeObjectInterface = require('./ContactNodeObjectInterface');
import IdInterface = require('./IdInterface');

/**
 * The `ContactNodeFactoryInterface` provides an Interface to create objects which implement the {@link core.topology.ContactNodeInterface}
 *
 * @interface
 * @class core.topology.ContactNodeFactoryInterface
 */
interface ContactNodeFactoryInterface {

	/**
	 * @method core.topology.ContactNodeFactoryInterface#create
	 *
	 * @param {core.topology.IdInterface} id
	 * @param {core.topology.ContactNodeAddressListInterface} addresses
	 * @returns {core.topology.ContactNodeInterface}
	 */
	create (id:IdInterface, addresses:ContactNodeAddressListInterface):ContactNodeInterface;

	/**
	 * @method core.topology.ContactNodeFactoryInterface#createFromObject
	 *
	 * @param {core.topology.ContactNodeObjectInterface} object
	 * @returns {core.topology.ContactNodeInterface}
	 */
	createFromObject(object:ContactNodeObjectInterface):ContactNodeInterface;

}

export = ContactNodeFactoryInterface;