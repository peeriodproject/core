/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The QueryInterface represents the search for files. This can be a hash-based query or a broadcast-based
 * query. Queries send the search object, which is assigned a 16 byte query identifier, through their circuits
 * and wait for replies within a specific time window.
 * Significant emitted events are:
 *
 * - 'end': This event gets emitted when the search has been completely finished or is aborted due to errors or
 * when the query could not be sent through circuits. It gets emitted with an abortMessageCode as argument which can be
 * further used to provide the fronted with visual feedback.
 *
 * - 'result': This events gets emitted as soon as a response to the query rolls in. The event gets called with
 * two arguments: The first is the list of nodes which can be used to feed the responder for possible future requests.
 * The second argument is the actual response object as a byte buffer.
 *
 * @interface
 * @class core.protocol.fileTransfer.QueryInterface
 */
interface QueryInterface extends NodeJS.EventEmitter {

	/**
	 * Aborts the query. No further results will roll in.
	 * When fully aborted, the 'end' event gets emitted.
	 *
	 * @method core.protocol.fileTransfer.QueryInterface#abort
	 *
	 * @param {string} abortMessageCode Optional message code which can be used for visual feedback.
	 */
	abort (abortMessageCode?:string):void;

	/**
	 * Returns the generated query identifier (16 bytes, hex string representation) of the query.
	 *
	 * @method core.protcool.fileTransfer.QueryInterface#getQueryID
	 *
	 * @returns {string} 16 byte hex string representation of the query identifier.
	 */
	getQueryId ():string;

	/**
	 * Kicks off the query by sending the query instructions through the established hydra circuits.
	 * Also sets the timeout the query lives.
	 *
	 * @method core.protocol.fileTransfer.QueryInterface#kickOff
	 */
	kickOff ():void;
}

export = QueryInterface;