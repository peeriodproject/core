import path = require('path');

import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLogger = require('./IrcLogger');
import IrcLoggerBackend = require('./IrcLoggerBackend');
import JSONConfig = require('../../config/JSONConfig');

/**
 * @module core.utils.logger.LoggerFactory
 */
module LoggerFactory {
	var _ircLogger = null;
	var _logPath:string = '';

	export function setLogPath (logPath:string) {
		_logPath = logPath;
	}

	export function create ():LoggerInterface {

		var envPronePath:string = process.env.NODE_ENV === 'test' ? 'src/config/mainConfig' : 'config/mainConfig';
		var configPath:string = path.join(process.cwd(), envPronePath);

		console.log(_logPath);

		if (!_ircLogger) {
			_ircLogger = new IrcLogger(new JSONConfig(configPath, ['net']), '', new IrcLoggerBackend(_logPath));
		}

		return _ircLogger;
	}

}

export = LoggerFactory;