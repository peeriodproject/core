import PluginStateObjectInterface = require('./PluginStateObjectInterface');

/**
 * The PluginValidator validates the source of a plugin before it is loaded into the application.
 *
 * @interface
 * @class core.plugin.PluginValidatorInterface
 */
interface PluginValidatorInterface {

	/**
	 * @method core.plugin.PluginValidatorInterface#validateState
	 *
	 * @param {core.plugin.PluginStateObjectInterface} pluginState
	 * @param {Function} callback
	 */
	validateState(pluginState:PluginStateObjectInterface, callback:(err:Error) => void):void;

}

export = PluginValidatorInterface;