var IrcLogger = require('./IrcLogger');
var IrcLoggerBackend = require('./IrcLoggerBackend');

var LoggerFactory;
(function (LoggerFactory) {
    console.log('module setup');
    var _availableLoggers = {};
    var _ircLoggerBackend = new IrcLoggerBackend();

    var defaultLoggers = {
        ircLogger: IrcLogger
    };

    for (var key in defaultLoggers) {
        register(key, defaultLoggers[key]);
    }

    console.log(_availableLoggers);

    function create(name) {
        var lowerName = name.toLowerCase();

        if (!_availableLoggers[lowerName]) {
            console.error('LoggerFactory.create: No logger found for name: "' + name + '"');
        }

        return _availableLoggers[lowerName];
    }
    LoggerFactory.create = create;

    function register(name, klass) {
        var lowerName = name.toLowerCase();

        if (_availableLoggers[lowerName]) {
            console.error('LoggerFactory.register: Another Logger with the name "' + name + '" is already registered.');
        }

        _availableLoggers[lowerName] = new klass(_ircLoggerBackend);
    }
    LoggerFactory.register = register;
})(LoggerFactory || (LoggerFactory = {}));

module.exports = LoggerFactory;
//# sourceMappingURL=LoggerFactory.js.map
