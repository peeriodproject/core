/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import HydraNode = require('./HydraNode');

/**
 * The PendingCreateCellRequest represents the collection of CREATE_CELL_ADDITIVE requests, until all parts
 * of the additive sharing scheme have been collected.
 *
 * @interface
 * @class core.protocol.hydra.PendingCreateCellRequest
 */
interface PendingCreateCellRequest {

	/**
	 * The universally unique identifier of the additive sharing scheme
	 */
	uuid:string;

	/**
	 * The circuitId of the CREATE_CELL_ADDITIVE iniator message of the batch
	 */
	circuitId?:string;

	/**
	 * Array of Buffers which result in the cleartext when combined.
	 */
	additivePayloads:Array<Buffer>;

	/**
	 * The node who sent the CREATE_CELL_ADDITIVE initiator message.
	 * Should already have circuitId and socketIdentifier set.
	 */
	initiator?:HydraNode;

	/**
	 * The timeout indicating how long this object will live and wait for its completion, before being removed.
	 */
	timeout:number;
}

export = PendingCreateCellRequest;