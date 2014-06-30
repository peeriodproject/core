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
	 * Registers a listener function that gets called whenever a new result for an incoming query was found
	 *
	 * @member core.search.SearchResponseManagerInterface#onResultsFound
	 *
	 * @param callback The listener that gets called with an array of results as the first argument
	 */
	onResultsFound (callback:(results:Array<Object>) => any):void;

	/**
	 * Validates the given search query by quering the local database.
	 *
	 * @member core.search.SearchResponseManagerInterface#valiateQueryAndTriggerResults
	 *
	 * @param {string} queryId todo check if we need the id here!
	 * @param {Object} query
	 * @param {Object} callback The callback triggers after the query respond with a possible error as first argument
	 */
	valiateQueryAndTriggerResults (queryId:string, query:Object, callback:(err:Error) => any):void;
}

export = SearchResponseManagerInterface;