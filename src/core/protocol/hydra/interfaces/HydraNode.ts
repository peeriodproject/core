/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * HydraNode represents a node within a hydra circuit.
 *
 * @interface core.protocol.hydra.HydraNode
 */
interface HydraNode {
	/**
	 * Shared circuit id.
	 */
	circuitId?:string;

	/**
	 * Socket identifier
	 */
	socketIdentifier?:string;

	/**
	 * 'Incoming' symmetric key. This is optional, because as a node within a circuit,
	 * the encryption must be handled differently, as the node actually only shares keys with the initiator.
	 */
	incomingKey?:Buffer;

	/**
	 * 'Outgoing' symmetric key. This is optional, because as a node within a circuit,
	 * the encryption must be handled differently, as the node actually only shares keys with the initiator.
	 */
	outgoingKey?:Buffer;

	/**
	 * The IP address of the node.
	 */
	ip?:string;

	/**
	 * An optional port through which the node can be reached.
	 */
	port?:number;

}

export = HydraNode;