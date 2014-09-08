import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.search.SearchFormManagerInterface
 */
interface SearchFormManagerInterface extends ClosableAsyncInterface {

	/**
	 * Adds a _raw_ query and processes it with the current form
	 *
	 * @method core.search.SearchFormManagerInterface#addQuery
	 *
	 * @param query
	 * @param {Function} callback
	 */
	addQuery (query:any, callback?:(err:Error, queryId:string) => any):void;

	/**
	 * Returns the state that will be saved to a persistent storage on close
	 *
	 * @method core.search.SearchFormManagerInterface#getState
	 *
	 * @param {Function} callback The callback with the state as the first argument
	 */
	getState (callback:(state:Object) => any):void;

	/**
	 * Calls the given callback with a list of available forms as the first argument.
	 *
	 * @method core.search.SearchFormManagerInterface#getFormIdentifiers
	 *
	 * @param {Function}
	 */
	getFormIdentifiers (callback:(identifiers:Array<string>) => any):void;

	/**
	 * Calls the given callback with the identifier of the currently activated form as the first argument.
	 *
	 * @method core.search.SearchFormManagerInterface#getCurrentFormIdentifier
	 *
	 * @param {Function} callback
	 */
	getCurrentFormIdentifier (callback:(identifier:string) => any):void;

	/**
	 * Sets the form which will be used for further query processing
	 *
	 * @method core.search.SearchFormManagerInterface#setForm
	 *
	 * @param {string} identifier
	 * @param {Function} identifier
	 */
	setForm (identifier:string, callback?:(err:Error) => any):void;

}

export = SearchFormManagerInterface