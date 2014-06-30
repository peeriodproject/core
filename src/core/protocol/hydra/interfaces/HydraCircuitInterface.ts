/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNode = require('./HydraNode');

/**
 * The HydraCircuit represents one Onion Routing circuit. When constructed, it tries to extend itself up to the desired
 * number of hops.
 * If anything goes wrong, or a maximum number of retries was exceeded when always facing rejections,
 * the circuit tears itself down. A teardown consists of merely detaching the events and closing the socket - as soon as
 * the connected socket is closed, a circuit is considered unusable.
 *
 * Once it is torn down, a 'isTornDown' event is emitted. This signals that the circuit can no longer be used and
 * should be discarded / substituted.
 *
 * On the other hand, once the circuit has been fully constructed and is considered usable, a 'isConstructed' event
 * is emitted.
 *
 * @interface
 * @class core.protocol.hydra.HydraCircuitInterface
 */
interface HydraCircuitInterface extends NodeJS.EventEmitter {

	/**
	 * Kicks off the construction of the circuit.
	 *
	 * @method core.protocol.hydra.HydraCircuitInterface#construct
	 */
	construct ():void;

	/**
	 * Returns the circuit ID shared with the first node of the circuit
	 *
	 * @method core.protocol.hydra.HydraCircuitInterface#getCircuitId
	 *
	 * @returns {string} The circuit ID
	 */
	getCircuitId ():string;

	/**
	 * Sends a file message through the circuit, if it is constructed.
	 *
	 * @method core.protocol.hydra.HydraCircuitInterface#sendFileMessage
	 *
	 * @param {Buffer} payload Payload of the FILE_TRANSFER message to send.
	 * @param {core.protocol.hydra.HydraNode} earlyExit Optional. Early exit node in this circuit.
	 */
	sendFileMessage (payload:Buffer, earlyExit?:HydraNode):void;

	/**
	 * Forcefully tears down the circuit
	 *
	 * @method core.protocol.hydra.HydraCircuitInterface#teardown
	 */
	teardown ():void;
}

export = HydraCircuitInterface;