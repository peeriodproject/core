/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * The CellManager collects CREATE_CELL_ADDITIVE messages and tries to achieve a full batch of additive shares.
 * It then decides whether it still can be part of hydra circuit and acts accordingly by either rejecting the request
 * or accepting it and creating a {@link core.protocol.hydra.HydraCellInterface}
 *
 * @interface
 * @class core.protocol.hydra.CellManagerInterface
 * @extends NodeJS.EventEmitter
 */
interface CellManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Sends a FILE_TRANSFER message with the given payload as an ENCRYPTED_DIGEST message through the cell
	 * with the predecessor's circuitId equal to the provided circuit ID.
	 *
	 * @method core.protocol.hydra.CellManagerInterface#pipeFileTransferMessage
	 *
	 * @param {string} predecessorCircuitId
	 * @param {Buffer} payload
	 * @returns {boolean} `true` if the cell existed, `false` if not.
	 */
	pipeFileTransferMessage (predecessorCircuitId:string, payload:Buffer):boolean;

	/**
	 * Forcefully tears down a cell by the provided predecessorCircuitId.
	 *
	 * @method core.protocol.hydra.CellManagerInterface#teardownCell
	 *
	 * @param {string} predecessorCircuitId The predecessorCircuitId of the cell to tear down.
	 */
	teardownCell (predecessorCircuitId:string):void;
}

export = CellManagerInterface;