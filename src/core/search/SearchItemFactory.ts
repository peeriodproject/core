import SearchItemFactoryInterface = require('./interfaces/SearchItemFactoryInterface');
import SearchItemInterface = require('./interfaces/SearchItemInterface');

import SearchItem = require('./SearchItem');

/**
 * @class core.search.SearchItemFactory
 * @implements core.search.SearchItemFactoryInterface
 */
class SearchItemFactory implements SearchItemFactoryInterface {

	/**
	 * Creates a search item instance from the given data
	 *
	 * todo specifiy data type
	 *
	 * @method core.search.SearchItemFactory#create
	 *
	 * @param {} data
	 * @returns {core.search.SearchItemInterface}
	 */
	public create (data:Array<Object>):SearchItemInterface {
		return new SearchItem(data);
	}

}

export = SearchItemFactory;