var path = require('path');

var IrcLogger = require('./IrcLogger');
var IrcLoggerBackend = require('./IrcLoggerBackend');
var JSONConfig = require('../../config/JSONConfig');

var LoggerFactory;
(function (LoggerFactory) {
    var _ircLogger = null;

    function create(uuid) {
        if (typeof uuid === "undefined") { uuid = ''; }
        var envPronePath = process.env.NODE_ENV === 'test' ? 'src/config/mainConfig' : 'config/mainConfig';

        var configPath = path.join(process.cwd(), envPronePath);

        if (!_ircLogger) {
            _ircLogger = new IrcLogger(new JSONConfig(configPath, ['net']), uuid, new IrcLoggerBackend());
        }

        return _ircLogger;
    }
    LoggerFactory.create = create;
})(LoggerFactory || (LoggerFactory = {}));

module.exports = LoggerFactory;
//# sourceMappingURL=LoggerFactory.js.map
