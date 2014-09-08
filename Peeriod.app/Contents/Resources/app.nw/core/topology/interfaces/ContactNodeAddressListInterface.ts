import ContactNodeAddressInterface = require('./ContactNodeAddressInterface');

/**
 * A `ContactNodeAddressListInterface` represents a list of {@link core.topology.ContactNodeAddressInterface}.
 *
 * @interface
 * @class core.topology.ContactNodeAddressListInterface
 */
interface ContactNodeAddressListInterface extends Array<ContactNodeAddressInterface> {
}

export = ContactNodeAddressListInterface;