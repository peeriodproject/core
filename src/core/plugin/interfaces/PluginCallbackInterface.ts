import PluginInterface = require('./PluginInterface');

/**
 * @interface
 * @class core.plugin.PluginCallbackInterface
 */
interface PluginCallbackInterface {

	(err:Error, plugin: PluginInterface): void

}

export = PluginCallbackInterface;