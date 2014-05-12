import PluginRunnerFactoryInterface = require('./interfaces/PluginRunnerFactoryInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');

import PluginRunner = require('./PluginRunner');

/**
 * @class core.plugin.PluginRunnerFactory
 * @implements core.plugin.PluginRunnerFactoryInterface
 */
class PluginRunnerFactory implements PluginRunnerFactoryInterface {

	create (identifier:string, path:string):PluginRunnerInterface {
		return new PluginRunner(identifier, path);
	}

}

export = PluginRunnerFactory;