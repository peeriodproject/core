import PluginRunnerInerface = require('./PluginRunnerInterface');

/**
 * @interface
 * @class core.plugin.PluginRunnerMapInerface
 */
interface PluginRunnerMapInerface {
	[identifier:string]: PluginRunnerInerface
}

export = PluginRunnerMapInerface;