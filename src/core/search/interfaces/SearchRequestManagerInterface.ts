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
	 * @member core.search.SearchRequestManagerInterface#addResponse
	 *
	 * @param {string} queryId
	 * @param {Object} responseBody
	 * @param {Function} callback
	 */
	addResponse (queryId:string, responseBody:Object, callback?:(err:Error) => any):void;

	/**
	 * Adds a listener to the internal event emitter that gets called whenever a new response matches a running query.
	 *
	 * @member core.search.SearchRequestManagerInterface#onResultsChanged
	 *
	 * @param {Function} callback The first argument will be the `queryId` that matched the document.
	 */
	onQueryResultsChanged (callback:Function):void;

	/**
	 * Adds a listener to the internal event emitter that triggers the function whenever a query timed out.
	 *
	 * @member core.search.SearchRequestManagerInterface#onQueryTimeout
	 *
	 * @param {Function} callback The listener function. The first argument will be the `queryId` of the timed out query.
	 */
	onQueryTimeout (callback:Function):void;

}

export = SearchRequestManagerInterface;