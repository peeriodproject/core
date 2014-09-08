/**
 * The `PluginPathListInterface` represents an object of plugin name:paths combinations.
 *
 * @example
 *   var pluginPathList:PluginPathListInterface = {
 *     'pluginFolderName': '/path/to/the/pluginFolder/pluginFolderName'
 *   };
 *
 * @interface
 * @class core.plugin.PluginPathListInterface
 */
interface PluginPathListInterface {
	[name:string]:string;

}

export = PluginPathListInterface;