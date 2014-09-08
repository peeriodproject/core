import PluginLoaderInterface = require('./PluginLoaderInterface');

/**
 * @interface
 * @class core.plugin.PluginLoaderMapInterface
 */
interface PluginLoaderMapInterface {
	[identifier:string]: PluginLoaderInterface
}

export = PluginLoaderMapInterface;