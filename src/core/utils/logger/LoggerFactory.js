var path = require('path');

var IrcLogger = require('./IrcLogger');
var IrcLoggerBackend = require('./IrcLoggerBackend');
var JSONConfig = require('../../config/JSONConfig');

var LoggerFactory;
(function (LoggerFactory) {
    var _ircLogger = null;

    function create(uuid) {
        if (typeof uuid === "undefined") { uuid = ''; }
        var configPath = path.join(process.cwd(), 'src/config/mainConfig');

        if (!_ircLogger) {
            _ircLogger = new IrcLogger(new JSONConfig(configPath, ['simulator']), uuid, new IrcLoggerBackend());
        }

        return _ircLogger;
    }
    LoggerFactory.create = create;
})(LoggerFactory || (LoggerFactory = {}));

module.exports = LoggerFactory;
//# sourceMappingURL=LoggerFactory.js.map
