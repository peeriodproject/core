import PluginInterface = require('./PluginInterface');

/**
 * A PluginRunner represents a sandbox which loads a specified Plugin and runs it in a isolated environment.
 *
 * @interface
 * @class core.plugin.PluginRunnerInterface
 */
interface PluginRunnerInterface extends PluginInterface  {

	cleanup():void;

	getMapping(callback:Function):void;

	getQuery (query:Object, callback:Function):void;

	getSearchFields(callback:Function):void;

}

export = PluginRunnerInterface;