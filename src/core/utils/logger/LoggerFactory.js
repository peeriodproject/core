var IrcLogger = require('./IrcLogger');
var IrcLoggerBackend = require('./IrcLoggerBackend');
var JSONConfig = require('../../config/JSONConfig');

var LoggerFactory;
(function (LoggerFactory) {
    var _ircLogger = null;

    function create(uuid) {
        if (typeof uuid === "undefined") { uuid = ''; }
        if (!_ircLogger) {
            _ircLogger = new IrcLogger(new JSONConfig('../../../config/mainConfig', ['simulator']), uuid, new IrcLoggerBackend());
        }

        return _ircLogger;
    }
    LoggerFactory.create = create;
})(LoggerFactory || (LoggerFactory = {}));

module.exports = LoggerFactory;
//# sourceMappingURL=LoggerFactory.js.map
