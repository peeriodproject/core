import PluginApiInterface = require('./interfaces/PluginApiInterface');

var _state:Object = {};

/**
 * // todo docs
 * @type {{getState: (function(): Object), setState: (function(Object): void)}}
 */
export var api:PluginApiInterface = {

	getState: function ():Object {
		return _state;
	},

	setState: function (state:Object):void {
		console.log('setting the state', state);
		_state = state;
	}

};