import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLogger = require('./IrcLogger');
import IrcLoggerBackend = require('./IrcLoggerBackend');
import JSONConfig = require('../../config/JSONConfig');

module LoggerFactory {
	var _ircLogger = null;

	export function create (uuid:string = ''):LoggerInterface {
		if (!_ircLogger) {
			_ircLogger = new IrcLogger(new JSONConfig('../../../config/mainConfig', ['simulator']), uuid, new IrcLoggerBackend());
		}

		return _ircLogger;
	}

}

export = LoggerFactory;