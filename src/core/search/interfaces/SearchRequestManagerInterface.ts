import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 *
 * @interface
 * @class core.search.SearchRequestManagerInterface
 */
interface SearchRequestManagerInterface extends ClosableAsyncInterface {

	/**
	 *
	 * @member core.search.SearchRequestManagerInterface#addQuery
	 *
	 * @param {Object} query
	 * @param {Function} callback
	 */
	addQuery (query:Object, callback:(err:Error) => any):void;

	/**
	 * @member core.search.SearchRequestManagerInterface#queryExists
	 *
	 * @param {Function} callback
	 */
	queryExists (callback:(exists:boolean) => any):void;

	/**
	 * @member core.search.SearchRequestManagerInterface#onResultsChanged
	 *
	 * @param {string} queryId
	 * @param {Function} callback
	 */
	onQueryResultsChanged (queryId:string, callback:Function):void;

}

export = SearchRequestManagerInterface;