/// <reference path='../../main.d.ts' />

import PluginStateObjectInterface = require('./interfaces/PluginStateObjectInterface');
import PluginValidatorInterface = require('./interfaces/PluginValidatorInterface');

/**
 * @interface
 * @class core.plugin.PluginValidator
 */
class PluginValidator implements PluginValidatorInterface {

	public validateState (pluginState:PluginStateObjectInterface, callback:(err:Error) => void):void {
		// dummy method
		return process.nextTick(callback.bind(null, null));
	}

}

export = PluginValidator;