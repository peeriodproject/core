import SearchItemFactoryInterface = require('./interfaces/SearchItemFactoryInterface');
import SearchItemInterface = require('./interfaces/SearchItemInterface');

import SearchItem = require('./SearchItem');

/**
 * @class core.search.SearchItemFactory
 * @implements core.search.SearchItemFactoryInterface
 */
class SearchItemFactory implements SearchItemFactoryInterface {

	public create (data:Array<Object>):SearchItemInterface {
		return new SearchItem(data);
	}

}

export = SearchItemFactory;