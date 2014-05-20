import PluginLoaderInerface = require('./PluginLoaderInterface');

/**
 * @interface
 * @class core.plugin.PluginLoaderListInerface
 */
interface PluginLoaderListInerface {
	[identifier:string]: PluginLoaderInerface
}

export = PluginLoaderListInerface;