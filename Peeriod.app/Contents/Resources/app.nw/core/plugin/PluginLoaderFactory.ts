import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginLoaderFactoryInterface = require('./interfaces/PluginLoaderFactoryInterface');
import PluginLoaderInterface = require('./interfaces/PluginLoaderInterface');

import PluginLoader = require('./PluginLoader');

/**
 * @class core.plugin.PluginLoaderFactory
 * @implements core.plugin.PluginLoaderFactoryInterface
 */
class PluginLoaderFactory implements PluginLoaderFactoryInterface {

	create (config:ConfigInterface, path:string):PluginLoaderInterface {
		return new PluginLoader(config, path);
	}

}

export = PluginLoaderFactory;