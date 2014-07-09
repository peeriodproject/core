/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import QueryInterface = require('./QueryInterface');

/**
 * Class for creating query instances of different kinds.
 *
 * @interface
 * @class core.protocol.fileTransfer.QueryFactoryInterface
 */
interface QueryFactoryInterface {

	/**
	 * Constructs a broadcast based query instance ready to be kicked off by a given search object.
	 *
	 * @method core.protocol.fileTransfer.QueryFactoryInterface#constructBroadcastBasedQuery
	 *
	 * @param {Buffer} searchObject The object to search for via broadcast in its byte buffer representation.
	 * @returns {core.protocol.fileTransfer.QueryInterface} The broadcast based query instance
	 */
	constructBroadcastBasedQuery (searchObject:Buffer):QueryInterface;
}

export = QueryFactoryInterface;