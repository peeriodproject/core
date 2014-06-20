/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

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
	 * @method core.protocol.hydra.HydraCircuitInterface~_construct
	 */
	construct ():void;
}

export = HydraCircuitInterface;