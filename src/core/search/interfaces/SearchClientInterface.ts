import SearchApiInterface = require('./SearchApiInterface');

/**
 * The
 * @interface
 * @class core.search.SearchClientInterface
 */
interface SearchClientInterface extends SearchApiInterface {

	/**
	 * @param type
	 * @param mapping
	 * @param callback
	 */
	addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void;

	/**
	 *
	 * @param {string} type
	 * @param {Function} callback
	 */
	typeExists (type:string, callback:(exists:boolean) => any):void
}

export = SearchClientInterface;