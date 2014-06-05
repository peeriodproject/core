import path = require('path');

import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLogger = require('./IrcLogger');
import IrcLoggerBackend = require('./IrcLoggerBackend');
import JSONConfig = require('../../config/JSONConfig');

module LoggerFactory {
	var _ircLogger = null;

	export function create (uuid:string = ''):LoggerInterface {

		var envPronePath:string = process.env.NODE_ENV === 'test' ? 'src/config/mainConfig' : 'config/mainConfig';

		var configPath:string = path.join(process.cwd(), envPronePath);

		if (!_ircLogger) {
			_ircLogger = new IrcLogger(new JSONConfig(configPath, ['net']), uuid, new IrcLoggerBackend());
		}

		return _ircLogger;
	}

}

export = LoggerFactory;