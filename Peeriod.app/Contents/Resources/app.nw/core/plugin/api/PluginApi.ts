import PluginApiInterface = require('./interfaces/PluginApiInterface');

/**
 * // todo docs
 * @type {{getState: (function(): Object), setState: (function(Object): void)}}
 */
export var api:PluginApiInterface = (function () {
	var _state:Object = {};

	return {
		getState: function ():Object {
			return _state;
		},

		setState: function (state:Object):void {
			_state = state;
		}
	};
}());