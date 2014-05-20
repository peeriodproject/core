/**
 * @interface
 * @class core.search.PluginApiInterface
 */
interface PluginApiInterface {

	getState():Object;

	/**
	 * Saves the state of the plugin as
	 * @param state
	 */
	setState(state:Object):void;
}

export = PluginApiInterface;