import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface')
import PluginInterface = require('./PluginInterface');
import PluginMapInterface = require('./PluginMapInterface');
import PluginPathListInterface = require('./PluginPathListInterface');

/**
 * @interface
 * @class core.plugin.PluginManager
 */
interface PluginManagerInterface extends ClosableAsyncInterface {

	/**
	 * Checks the plugin folder for new plugins and calls the specified callback
	 *
	 * @method core.plugin.PluginManagerInterface#checkPluginFolderForNewPlugins
	 */
	//checkPluginFolderForNewPlugins(callback:(err:Error, pluginPaths:PluginPathListInterface) => void):void;

	/**
	 * Loads the plugin state from a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManagerInterface#loadPluginState
	 */
	//loadPluginState(callback:(err:Error, pluginState:any) => void):void;

	/**
	 * Saves the plugin state to a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManagerInterface#savePluginState
	 */
	//savePluginState(callback:(err:Error, pluginState:any) => void):void;
}

export = PluginManagerInterface;