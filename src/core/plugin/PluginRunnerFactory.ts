import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginRunnerFactoryInterface = require('./interfaces/PluginRunnerFactoryInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');

import PluginRunner = require('./PluginRunner');

/**
 * @class core.plugin.PluginRunnerFactory
 * @implements core.plugin.PluginRunnerFactoryInterface
 */
class PluginRunnerFactory implements PluginRunnerFactoryInterface {

	create (config:ConfigInterface, identifier:string, path:string):PluginRunnerInterface {
		return new PluginRunner(config, identifier, path);
	}

}

export = PluginRunnerFactory;