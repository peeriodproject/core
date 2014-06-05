import SearchItemInterface = require('./SearchItemInterface');

/**
 * @interface
 * @class core.search.SearchItemFactoryInterface
 */
interface SearchItemFactoryInterface {

	create (data:Array<Object>):SearchItemInterface;
	
}

export = SearchItemFactoryInterface;