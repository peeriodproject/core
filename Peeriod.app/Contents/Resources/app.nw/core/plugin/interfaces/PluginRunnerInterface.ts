import PluginInterface = require('./PluginInterface');

/**
 * A PluginRunner represents a sandbox which loads a specified Plugin and runs it in a isolated environment.
 *
 * @interface
 * @class core.plugin.PluginRunnerInterface
 */
interface PluginRunnerInterface extends PluginInterface {

	cleanup ():void;

	getMapping (callback:(err:Error, mapping:Object) => any):void;

	getQuery (query:Object, callback:(err:Error, query:Object) => any):void;

	getResultFields (callback:(err:Error, fields:Object) => any):void;

	getSearchFields (callback:(err:Error, searchFields:Object) => any):void;

}

export = PluginRunnerInterface;