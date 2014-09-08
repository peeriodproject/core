import PluginInterface = require('./PluginInterface');

/**
 * A `PluginListInterface` represents an array of {@link core.plugin.PluginInterface}.
 *
 * @interface
 * @class core.plugin.PluginListInterface
 */
interface PluginListInterface extends Array<PluginInterface> {
}

export = PluginListInterface;