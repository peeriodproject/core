import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import SearchStoreInterface = require('./SearchStoreInterface');
import SearchStoreOptions = require('./SearchStoreOptions');

/**
 * @interface
 * @class core.search.SearchStoreFactoryInterface
 */
interface SearchStoreFactoryInterface {

	create (config:ConfigInterface, options:SearchStoreOptions):SearchStoreInterface;

	getDefaults ():SearchStoreOptions;
}

export = SearchStoreFactoryInterface;