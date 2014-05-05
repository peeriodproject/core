import ContactNodeInterface = require('./ContactNodeInterface');

/**
 * A `ContactNodeListInterface` represents a list of {@link core.topology.ContactNodeInterface}.
 *
 * @interface
 * @class core.topology.ContactNodeListInterface
 */
interface ContactNodeListInterface extends Array<ContactNodeInterface> {

}

export = ContactNodeListInterface;