/// <reference path='../../../../ts-definitions/node/node.d.ts' />
var path = require('path');
var stackTrace = require('stack-trace');

var ObjectUtils = require('../ObjectUtils');

/**
* @class core.utils.logger.IrcLogger
* @implements core.utils.logger.LoggerInterface
*/
var IrcLogger = (function () {
    /**
    * The prefix seperator
    *
    * @member {string} core.utils.logger.IrcLogger~_prefix
    */
    //private _prefix:string = ';';
    /**
    * @param {string} name
    */
    function IrcLogger(logger) {
        this._basePath = '';
        /**
        * The internally used irc backend instance
        *
        * @member {string} core.utils.logger.IrcLogger~_backend
        */
        this._backend = null;
        this._uuid = '';
        // @see http://stackoverflow.com/a/105074
        var generateUuid = (function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return function () {
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            };
        })();

        this._basePath = path.join(__dirname, '../../../../');
        this._backend = logger;
        this._uuid = generateUuid();
    }
    IrcLogger.prototype.debug = function (message, metadata) {
        this._backend.debug(message, metadata);
    };

    IrcLogger.prototype.error = function (message, metadata) {
        this._backend.error(message, metadata);
    };

    IrcLogger.prototype.info = function (message, metadata) {
        metadata = this._updateMetadata(metadata);
        this._backend.info(message, metadata);
    };

    IrcLogger.prototype.log = function (level, message, metadata) {
        metadata = this._updateMetadata(metadata);

        this._backend.log(level, message, metadata);
    };

    IrcLogger.prototype.warn = function (message, metadata) {
        this._backend.warn(message, metadata);
    };

    IrcLogger.prototype._updateMetadata = function (metadata) {
        if (typeof metadata === "undefined") { metadata = {}; }
        var stack = stackTrace.get();

        var functionName = '';

        for (var i in stack) {
            var name = stack[i].getFunctionName();
            var fileName = stack[i].getFileName();

            if (fileName.indexOf('/logger/') === -1) {
                functionName = stack[i].isConstructor() ? name + '.constructor' : name;

                break;
            }
            /*// reached the end of our implementation
            if (!name || fileName.indexOf(this._basePath) !== 0) {
            console.log('. . . . . . . . . . . . . . . . . . . . . . . .');
            console.log(name);
            console.log(stack[i].getFileName());
            console.log(this._basePath);
            console.log(stack[i].getFileName().indexOf(this._basePath));
            break;
            }
            
            functionName = name;
            */
        }

        return ObjectUtils.extend(metadata, {
            _caller: functionName,
            _uuid: this._uuid
        });
    };
    return IrcLogger;
})();

module.exports = IrcLogger;
//# sourceMappingURL=IrcLogger.js.map
