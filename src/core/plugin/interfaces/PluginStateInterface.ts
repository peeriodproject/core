import PluginStateObjectListInterface = require('./PluginStateObjectListInterface');

/**
 * This Interface represents the plugin state used by the {@link core.plugin.PluginManagerInterface} to store the state
 * about the plugins in the applcation.
 *
 * @interface
 * @class core.plugin.PluginStateObjectInterface
 */
interface PluginStateInterface {
	active:PluginStateObjectListInterface;
	idle:PluginStateObjectListInterface;
	inactive:PluginStateObjectListInterface;
	ignored:PluginStateObjectListInterface;
}

export = PluginStateInterface;