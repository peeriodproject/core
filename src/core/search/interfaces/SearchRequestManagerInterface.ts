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
	 * @member core.search.SearchRequestManagerInterface#addResponse
	 *
	 * @param {string} queryId
	 * @param {Buffer} responseBody
	 * @param {Object} responseMeta
	 * @param {Function} [callback]
	 */
	addResponse (queryId:string, responseBody:Buffer, responseMeta:Object, callback?:(err:Error) => any):void;

	/**
	 * Gets the responses for the given `queryId` and returns them in the callback
	 *
	 * todo ts-definition
	 *
	 * @member core.search.SearchRequestManagerInterface#getResponses
	 *
	 * @param {string} queryId
	 * @param {Function} callback
	 */
	getResponses (queryId:string, callback:(err:Error, responses:any) => any):void;

	/**
	 * Adds a listener to the internal event emitter that triggers whenever a new query is registered.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryAdd
	 *
	 * @param callback The arguments will be the `queryId` and the raw `queryBody` that was added.
	 */
	onQueryAdd (callback:(queryId:string, queryBody:Object) => any):void;

	/**
	 * Adds a listener to the internal event emitter that triggers whenever a query ends after a specified timeframe expired
	 * and after it got some results back. This event preceded by at least one `resultsChanged` event.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryEnd
	 *
	 * @param callback The first argument will be the `queryId` that ended.
	 */
	onQueryEnd (callback:(queryId:string, reason:string) => any):void;

	/**
	 * Adds a listener to the internal event emitter that gets called whenever a new response matches a running query.
	 *
	 * @member core.search.SearchRequestManagerInterface#onResultsChanged
	 *
	 * @param {Function} callback The first argument will be the `queryId` that matched the document.
	 */
	onQueryResultsChanged (callback:(queryId:string) => any):void;

	/**
	 * Adds a listener to the internal event emitter that gets called whenever a query was removed from the database.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryRemoved
	 *
	 * @param {Function} callback
	 */
	onQueryRemoved (callback:(queryId:string) => any):void;

	/**
	 * Adds a listener to the internal event emitter that triggers the function whenever a query was canceled.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryCanceled
	 *
	 * @param {Function} callback The listener function. The first argument will be the `queryId` of the canceled query.
	 */
	onQueryCanceled (callback:(queryId:string, reason:string) => any):void;

	/**
	 * The query was canceled, aborted or timed out within the network layer.
	 * Checks whether the query for the given `queryId` got any results yet and calls the listeners {@link core.search.SearchRequestManagerInterface#onQueryEnd}
	 * if it got some results. If no results have arrived the query will be deleted from the database and the {@link core.search.SearchRequestManagerInterface#onQueryCancel}
	 * method will be called afterwards.
	 *
	 * @method core.search.SearchRequestManagerInterface#queryEnded
	 *
	 * @param {string} queryId
	 * @param {string} reason
	 */
	queryEnded (queryId:string, reason:string):void;

	/**
	 * Removes the query an all responses from the database.
	 *
	 * @member core.search.SearchRequestManagerInterface#removeQuery
	 *
	 * @param {string} queryId
	 * @param {Function} [callback]
	 */
	removeQuery (queryId:string, callback?:(err:Error) => any):void;

}

export = SearchRequestManagerInterface;