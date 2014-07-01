/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * The `SearchResponseManager` waits for new incoming queries and tries to get results out of the local database which
 * can be send back to the origin.
 *
 * @interface
 * @class core.search.SearchResponseManagerInterface
 * @extends core.utils.ClosableAsyncInterface
 */
interface SearchResponseManagerInterface extends ClosableAsyncInterface {

	/**
	 * Registers a listener function that gets called whenever a new result (set) for an incoming query was found
	 *
	 * @member core.search.SearchResponseManagerInterface#onResultsFound
	 *
	 * @param callback The listener that gets called with the `queryId` an the results set as arguments
	 */
	onResultsFound (callback:(queryId:string, results:Object) => any):void;

	/**
	 * Validates the given search query by quering the local database.
	 *
	 * @member core.search.SearchResponseManagerInterface#validateQueryAndTriggerResults
	 *
	 * @param {string} queryId todo check if we need the id here!
	 * @param {Buffer} queryBuffer
	 * @param {Object} callback The callback triggers after the query respond with a possible error as first argument
	 */
	validateQueryAndTriggerResults (queryId:string, queryBuffer:Buffer, callback?:(err:Error) => any):void;
}

export = SearchResponseManagerInterface;