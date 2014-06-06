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

	/**
	 * Creates a search store instance
	 *
	 * @method core.search.SearchStoreFactory#create
	 *
	 * @param {core.config.ConfigInterface} config
	 * @param {core.search.SearchStoreOptions} options
	 * @returns {core.search.SearchStoreInterface}
	 */
	public create (config:ConfigInterface, options?:SearchStoreOptions):SearchStoreInterface {
		return new SearchStore(config, options);
	}

	/**
	 * todo check if we can remove this method
	 */
	public getDefaults ():SearchStoreOptions {
		return SearchStore.getDefaults();
	}

}

export = SearchStoreFactory;