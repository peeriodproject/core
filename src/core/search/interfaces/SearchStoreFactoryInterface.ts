import AppQuitHandlerInterface = require('../../utils/interfaces/AppQuitHandlerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import SearchStoreInterface = require('./SearchStoreInterface');
import SearchStoreOptions = require('./SearchStoreOptions');

/**
 * @interface
 * @class core.search.SearchStoreFactoryInterface
 */
interface SearchStoreFactoryInterface {

	/**
	 * Creates a new {@link core.search.SearchStore} instance
	 *
	 * @method core.search.SearchStoreFactoryInterface#create
	 *
	 * @param {core.config.ConfigInterface} config
	 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
	 * @param {core.search.SearchStoreOptions} options
	 *
	 * @returns {core.search.SearchStoreInterface}
	 */
	create (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, options:SearchStoreOptions):SearchStoreInterface;

	/**
	 * todo recheck and remove this method
	 */
	getDefaults ():SearchStoreOptions;
}

export = SearchStoreFactoryInterface;