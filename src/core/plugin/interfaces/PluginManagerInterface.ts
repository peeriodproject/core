import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface')
import PluginInterface = require('./PluginInterface');
import PluginMapInterface = require('./PluginMapInterface');
import PluginPathListInterface = require('./PluginPathListInterface');

/**
 * The `PluginManagerInterface` is responsible for the state of plugins loaded into the application.
 *
 * It should:
 * - load the state from a persistant storage on open
 * - save the state to a persistant storage on close
 * - be able to find new plugins and add the specific plugin state to the storage
 * - it should be able to change the state of a specific plugin {@link core.plugin.PluginStateInterface}
 *
 *
 * @interface
 * @class core.plugin.PluginManagerInterface
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

	findNewPlugins (callback?:(err:Error) => void):void;
}

export = PluginManagerInterface;