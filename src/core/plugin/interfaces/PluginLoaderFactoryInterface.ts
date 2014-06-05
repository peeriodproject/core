import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import PluginLoaderInterface = require('./PluginLoaderInterface');

/**
 * @interface
 * @class core.plugin.PluginLoaderFactoryInterface
 */
interface PluginLoaderFactoryInterface {

	/**
	 * @method core.plugin.PluginLoaderFactoryInterface#create
	 *
	 * @param {string} path
	 */
	create(config:ConfigInterface, path:string):PluginLoaderInterface;

}

export = PluginLoaderFactoryInterface;