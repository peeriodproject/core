import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLogger = require('./IrcLogger');
import IrcLoggerBackend = require('./IrcLoggerBackend');

module LoggerFactory {
	console.log('module setup');
	var _availableLoggers:{ [name:string]:LoggerInterface; } = {};
	var _ircLoggerBackend = new IrcLoggerBackend();

	var defaultLoggers = {
		ircLogger: IrcLogger
	};

	for (var key in defaultLoggers) {
		register(key, defaultLoggers[key]);
	}

	console.log(_availableLoggers);

	export function create (name:string):LoggerInterface {
		var lowerName:string = name.toLowerCase();

		if (!_availableLoggers[lowerName]) {
			console.error('LoggerFactory.create: No logger found for name: "' + name + '"');
		}

		return _availableLoggers[lowerName];
	}

	export function register (name:string, klass:any):void {
		var lowerName:string = name.toLowerCase();

		if (_availableLoggers[lowerName]) {
			console.error('LoggerFactory.register: Another Logger with the name "' + name + '" is already registered.');
		}

		_availableLoggers[lowerName] = new klass(_ircLoggerBackend);
	}
}

export = LoggerFactory;