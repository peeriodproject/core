import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
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

	public create (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, options?:SearchStoreOptions):SearchStoreInterface {
		return new SearchStore(config, appQuitHandler, options);
	}


	/**
	 * todo check if we can remove this method
	 */
	public getDefaults ():SearchStoreOptions {
		return SearchStore.getDefaults();
	}

}

export = SearchStoreFactory;