import PluginLoaderInterface = require('./PluginLoaderInterface');

/**
 * @interface
 * @class core.plugin.PluginLoaderListInterface
 */
interface PluginLoaderListInterface {
	[identifier:string]: PluginLoaderInterface
}

export = PluginLoaderListInterface;