import BufferListInterface = require('../../utils/interfaces/BufferListInterface');
import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 *
 * @interface
 * @class core.search.SearchRequestManagerInterface
 */
interface SearchRequestManagerInterface extends ClosableAsyncInterface {

	/**
	 * @member core.search.SearchRequestManagerInterface#addQuery
	 *
	 * @param {Object} queryBody
	 * @param {Function} callback
	 */
	addQuery (queryBody:Object, callback?:(err:Error, queryId:string) => any):void;

	/**
	 * Adds a response to the specified `queryId`
	 *
	 * todo add an
	 * @member core.search.SearchRequestManagerInterface#addResponse
	 *
	 * @param {string} queryId
	 * @param {core.utils.BufferListInterface} responseBodies
	 * @param {Object} responseMeta
	 * @param {Function} callback
	 */
	addResponse (queryId:string, responseBodies:BufferListInterface, responseMeta:Object, callback?:(err:Error) => any):void;

	/**
	 * Adds a listener to the internal event emitter that triggers whenever a new query is registered.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryAdd
	 *
	 * @param callback The first argument will be the `queryId` that was added.
	 */
	onQueryAdd (callback:Function):void;

	/**
	 * Adds a listener to the internal event emitter that triggers whenever a query ends after a specified timeframe and
	 * after it got some results back. This event follows at least one `resultsChanged` event.	 *
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryEnd
	 *
	 * @param callback The first argument will be the `queryId` that ended.
	 */
	onQueryEnd (callback:Function):void;

	/**
	 * Adds a listener to the internal event emitter that gets called whenever a new response matches a running query.
	 *
	 * @member core.search.SearchRequestManagerInterface#onResultsChanged
	 *
	 * @param {Function} callback The first argument will be the `queryId` that matched the document.
	 */
	onQueryResultsChanged (callback:Function):void;

	/**
	 *
	 * @param callback
	 */
	onQueryRemoved (callback:Function):void;

	/**
	 * Adds a listener to the internal event emitter that triggers the function whenever a query timed out.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryTimeout
	 *
	 * @param {Function} callback The listener function. The first argument will be the `queryId` of the timed out query.
	 */
	onQueryTimeout (callback:Function):void;

	/**
	 * Removes the query an all responses from the database.
	 *
	 * @member core.search.SearchRequestManagerInterface#removeQuery
	 *
	 * @param {string} queryId
	 * @param {Function} callback
	 */
	removeQuery (queryId:string, callback?:(err:Error) => any):void;

}

export = SearchRequestManagerInterface;