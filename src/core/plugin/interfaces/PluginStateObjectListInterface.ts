import PluginStateObjectInterface = require('./PluginStateObjectInterface');

/**
 * This interface represents a list of {@link PluginStateObjectInterface}
 *
 * @interface
 * @class core.plugin.PluginStateObjectListInterface
 */
interface PluginStateObjectListInterface extends Array<PluginStateObjectInterface> {
}

export = PluginStateObjectListInterface;