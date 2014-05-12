import PluginRunnerInerface = require('./PluginRunnerInterface');

/**
 * @interface
 * @class core.plugin.PluginRunnerListInerface
 */
interface PluginRunnerListInerface {
	[identifier:string]: PluginRunnerInerface
}

export = PluginRunnerListInerface;