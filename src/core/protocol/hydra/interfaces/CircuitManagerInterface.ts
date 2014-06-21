/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * The CircuitManager keeps track of the Hydra circuits, constructs them and always tries to maintain an optimal desired
 * number of fully constructed, production ready circuits.
 * When it has reached the desired number of constructed circuits, it kicks off a 'desiredCircuitAmountReached' event.
 *
 * @interface
 * @class core.protocol.hydra.CircuitManagerInterface
 */
interface CircuitManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Starts the construction and watching of hydra circuits.
	 *
	 * @method core.protocol.hydra.CircuitManagerInterface#kickOff
	 */
	kickOff ():void;
}

export = CircuitManagerInterface;