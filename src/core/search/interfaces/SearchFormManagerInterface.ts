import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.search.SearchFormManagerInterface
 */
interface SearchFormManagerInterface extends ClosableAsyncInterface {

	/**
	 * Adds a _raw_ query and processes it with the current form
	 *
	 * @param query
	 * @param {Function} callback
	 */
	addQuery (query:any, callback?:(err:Error) => any):void

	/**
	 * Calls the given callback with a list of available forms as the first argument.
	 *
	 * @param {Function}
	 */
	getFormIdentifiers (callback:(identifiers:Array<string>) => any):void;

	/**
	 * Calls the given callback with the identifier of the currently activated form as the first argument.
	 *
	 * @param {Function} callback
	 */
	getCurrentFormIdentifier (callback:(identifier:string) => any):void;

	/**
	 * Sets the form which will be used for further query processing
	 *
	 * @param {string} identifier
	 * @param {Function} identifier
	 */
	setForm (identifier:string, callback?:(err:Error) => any):void;

}

export = SearchFormManagerInterface