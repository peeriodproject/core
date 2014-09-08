import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import PluginRunnerInterface = require('./PluginRunnerInterface');

/**
 * @interface
 * @class core.plugin.PluginRunnerFactoryInterface
 */
interface PluginRunnerFactoryInterface {

	/**
	 * @method core.plugin.PluginRunnerFactoryInterface#create
	 *
	 * @param {string} identifier
	 * @param {string} path
	 */
	create(config:ConfigInterface, identifier:string, path:string):PluginRunnerInterface;

}

export = PluginRunnerFactoryInterface;