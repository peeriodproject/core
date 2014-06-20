import PluginRunnerInterface = require('./PluginRunnerInterface');

/**
 * @interface
 * @class core.plugin.PluginRunnerMapInerface
 */
interface PluginRunnerMapInterface {
	[identifier:string]:PluginRunnerInterface;
}

export = PluginRunnerMapInterface;