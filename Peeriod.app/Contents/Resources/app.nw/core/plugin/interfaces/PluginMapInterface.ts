import PluginInterface = require('./PluginInterface');

/**
 * @interface
 * @class core.plugin.PluginMapInterface
 */
interface PluginMapInterface {
	[identifier:string]: PluginInterface
}

export = PluginMapInterface;