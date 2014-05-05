import ContactNodeAddressInterface = require('./ContactNodeAddressInterface');

/**
 * The `ContactNodeAddressFactoryInterface` provides an Interface to create objects which implements the {@link core.topology.ContactNodeAddressInterface}
 *
 * @interface
 * @class core.topology.ContactNodeAddressFactoryInterface
 */
interface ContactNodeAddressFactoryInterface {

	/**
	 * @method core.topology.ContactNodeAddressFactoryInterface#create
	 *
	 * @param {string} ip
	 * @param {number} port
	 * @returns {core.topology.ContactNodeAddressInterface}
	 */
	create (ip:string, port:number):ContactNodeAddressInterface;

}

export = ContactNodeAddressFactoryInterface;