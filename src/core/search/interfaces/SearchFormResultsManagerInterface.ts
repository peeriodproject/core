import SearchFormManagerInterface = require('./SearchFormManagerInterface');

/**
 * @interface
 * @class core.search.SearchFormResultsManagerInterface
 * @extends core.search.SearchFormManagerInterface
 */
interface SearchFormResultsManagerInterface extends SearchFormManagerInterface {

	transformResponses (responses:any, cleanupFields:boolean, callback:(err:Error, transformedResults:any) => any):void;

}

export = SearchFormResultsManagerInterface;