/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The ResponseManager is the class that listens to new broadcast queries, emits them on the search message bridge and
 * - if a valid response comes back - issues an EXTERNAL_FEED instruction with the results and a random list of feeding nodes
 * from its own circuits.
 *
 * @interface
 * @class core.protocol.fileTransfer.ResponseManagerInterface
 */
interface ResponseManagerInterface {

	/**
	 * Match a search object buffer against the search bridge and - when a response comes back - call the provided
	 * callback. This method is generally only used by end nodes of circuits who need to start broadcasts by themselves
	 * instead of catching queries from broadcasts.
	 *
	 * @method core.protocol.fileTransfer.ResponseManagerInterface#externalQueryHandler
	 *
	 * @param {string} identifier A query identifier
	 * @param {Buffer} searchObject The object to search for in its byte buffer representation
	 * @param {Function} callback Callback that gets called as soon as the bridge returns results
	 */
	externalQueryHandler (identifier:string, searchObject:Buffer, callback:(identifier:string, results:Buffer) => any):void;
}

export = ResponseManagerInterface;