import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLogger = require('./IrcLogger');
import IrcLoggerBackend = require('./IrcLoggerBackend');

module LoggerFactory {
	var _ircLogger = null;

	export function create (uuid:string = ''):LoggerInterface {
		if (!_ircLogger) {
			_ircLogger = new IrcLogger(uuid, new IrcLoggerBackend());
		}

		return _ircLogger;
	}

}

export = LoggerFactory;