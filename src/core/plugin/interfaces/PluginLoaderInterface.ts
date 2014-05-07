import PluginCallbackInterface = require('./PluginCallbackInterface');
import PluginInterface = require('./PluginInterface');
import PluginMapInterface = require('./PluginMapInterface');
import PluginNameListInterface = require('./PluginNameListInterface');
import PluginPathListInterface = require('./PluginPathListInterface');

/**
 * The `PluginLoaderInterface` can crawl the specified plugin folder and will find new possible plugins by looking for
 * folders that includes a __plugin-manifest file__. In the next step the {@link core.plugin.PluginManagerInterface} can
 * trigger the {@link core.plugin.PluginValidator} to analyse the plugin folder. It also provides an interface to update
 * a list of folder names that should be ignored within the lookup process.
 *
 * @interface
 * @class core.plugin.PluginLoader
 */
interface PluginLoaderInterface {

	/**
	 * Adds a folder name to the list of ignored folders.
	 *
	 * There are several cases in which a plugin folder can be ignored:
	 * - The plugin is invaid (did not pass the validation step)
	 * - The plugin is already activated
	 * - The plugin is marked as deactivated
	 *
	 * @param {core.plugin.PluginNameListInterface} pluginFolderNames
	 * @param {Function} callback (optional)
	 */
	addPluginFolderNamesToIgnoreList (pluginFolderNames:PluginNameListInterface, callback?:Function):void;

	/**
	 * Returns the paths of unloaded plugins found within the {@link core.plugin.PluginLoader#getPluginFolderPath}
	 *
	 * @method core.plugin.PluginLoader#findPlugins
	 *
	 * @param {Function} callback
	 */
	findPlugins (callback:(err:Error, pluginPaths:PluginPathListInterface) => void):void;

	/**
	 * Returns a copy of the list of ignored plugin folder names
	 *
	 * @param {Function} callback
	 */
	getIgnoredPluginFolderNames (callback:(names:PluginNameListInterface) => void):void;

	/**
	 * Creates the plugin-folder path of the application it if nessessary and returns the path in a callback.
	 *
	 * @method core.plugin.PluginLoader#getPluginFolderPath
	 *
	 * @param {Function} callback
	 */
	getPluginFolderPath (callback:(err:Error, path:string) => void):void;

	/**
	 * Removes a folder name from the ignored list.
	 *
	 * @param {core.plugin.PluginNameListInterface} pluginFolderNames
	 * @param {Function} callback (optional)
	 */
	removePluginFolderNamesFromIgnoreList (pluginFolderNames:PluginNameListInterface, callback?:Function):void;

}

export = PluginLoaderInterface;