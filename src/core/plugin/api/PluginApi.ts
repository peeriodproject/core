import PluginApiInterface = require('./interfaces/PluginApiInterface');

var _state = {};

export var api:PluginApiInterface = {

	getState: function ():Object {
		return _state;
	},

	setState: function (state:Object):void {
		console.log('setting the state', state);
	}

};