import ConfigInterface = require('../config/interfaces/ConfigInterface');
import SearchStoreFactoryInterface = require('./interfaces/SearchStoreFactoryInterface');
import SearchStoreInterface = require('./interfaces/SearchStoreInterface');
import SearchStoreOptions = require('./interfaces/SearchStoreOptions');

import SearchStore = require('./SearchStore');

/**
 * @class core.search.SearchStoreFactory
 * @implements core.search.SearchStoreFactoryInterface
 */
class SearchStoreFactory implements SearchStoreFactoryInterface {

	create (config:ConfigInterface, options?:SearchStoreOptions):SearchStoreInterface {
		return new SearchStore(config, options);
	}

}

export = SearchStoreFactory;