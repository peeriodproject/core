var path = require('path');

var IrcLogger = require('./IrcLogger');
var IrcLoggerBackend = require('./IrcLoggerBackend');
var JSONConfig = require('../../config/JSONConfig');

/**
* @module core.utils.logger.LoggerFactory
*/
var LoggerFactory;
(function (LoggerFactory) {
    var _ircLogger = null;
    var _logPath = '';

    function setLogPath(logPath) {
        _logPath = logPath;
    }
    LoggerFactory.setLogPath = setLogPath;

    function create() {
        var envPronePath = process.env.NODE_ENV === 'test' ? 'src/config/mainConfig' : 'config/mainConfig';
        var configPath = path.join(process.cwd(), envPronePath);

        if (!_ircLogger) {
            _ircLogger = new IrcLogger(new JSONConfig(configPath, ['net']), '', new IrcLoggerBackend(_logPath));
        }

        return _ircLogger;
    }
    LoggerFactory.create = create;
})(LoggerFactory || (LoggerFactory = {}));

module.exports = LoggerFactory;
//# sourceMappingURL=LoggerFactory.js.map
