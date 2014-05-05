/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * The `ContactNodeAddressInterface` represents a single Ip/Port combination at which the contact node is reachable from the outside.
 *
 * @interface
 * @class core.topology.ContactNodeAddressInterface
 */
interface ContactNodeAddressInterface {

	/**
	 * @method core.topology.ContactNodeAddressInterface#getIp
	 *
	 * @returns {string}
	 */
	getIp ():string;

	/**
	 * @method core.topology.ContactNodeAddressInterface#getPort
	 *
	 * @returns {number}
	 */
	getPort ():number;

	/**
	 * @method core.topology.ContactNodeAddressInterface#getAddressAsByteBuffer
	 *
	 * @returns {Buffer}
	 */
	getAddressAsByteBuffer ():Buffer;

}

export = ContactNodeAddressInterface;