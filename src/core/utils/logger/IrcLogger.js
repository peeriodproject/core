/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../../ts-definitions/winston/winston.d.ts' />
var winston = require('winston');

//import LoggerInterface = require('./interfaces/LoggerInterface.d');
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
    //constructor (prefix:string) {
    function IrcLogger() {
        /**
        * The internally used logging instance
        *
        * @member {string} core.utils.logger.IrcLogger~_logger
        */
        this._logger = null;
        //this._prefix = prefix;
        // typescript hack...
        var winLogger = winston.Logger;

        this._logger = new winLogger({
            transports: []
        });

        this._addTransportBasedOnEnvironment();

        this.info('irc logger created');
    }
    IrcLogger.prototype.debug = function (message, metadata) {
        message = this._addPrefix(message);

        if (metadata) {
            this._logger.debug(message, metadata);
        } else {
            this._logger.debug(message);
        }
    };

    IrcLogger.prototype.error = function (message, metadata) {
        message = this._addPrefix(message);

        this._logger.error(message, metadata);
    };

    IrcLogger.prototype.info = function (message, metadata) {
        message = this._addPrefix(message);

        if (metadata) {
            this._logger.info(message, metadata);
        } else {
            this._logger.info(message);
        }
    };

    IrcLogger.prototype.log = function (level, message, metadata) {
        message = this._addPrefix(message);

        if (metadata) {
            this._logger.log(level, message, metadata);
        } else {
            this._logger.log(level, message);
        }
    };

    IrcLogger.prototype.warn = function (message, metadata) {
        message = this._addPrefix(message);

        if (metadata) {
            this._logger.warn(message, metadata);
        } else {
            this._logger.warn(message);
        }
    };

    IrcLogger.prototype._addPrefix = function (message) {
        return message;
    };

    IrcLogger.prototype._addTransportBasedOnEnvironment = function () {
        if (process.env.NODE_ENV === 'test') {
            this._logger.add(winston.transports.Console, {});
        } else {
            // 9 chars official max. length https://tools.ietf.org/html/rfc2812#section-1.2.1
            //var max:number = 10000000;
            var max = 10000000000000;
            var nick = 'a' + Math.round(Math.random() * max);
            var userName = 'b' + Math.round(Math.random() * max);
            var realName = 'c' + Math.round(Math.random() * max);

            this._logger.add(require('winston-irc'), {
                host: 'irc.freenode.net',
                port: 6697,
                ssl: true,
                nick: nick,
                userName: userName,
                realName: realName,
                channels: [
                    '#jj-abschluss'
                ],
                onError: function (err) {
                    //console.log('--- IRC ERROR ---');
                    //console.log(err);
                }
            });
        }
    };
    return IrcLogger;
})();

//export = IrcLogger;
var IrcLoggerInstance = new IrcLogger();

module.exports = IrcLoggerInstance;
/*var foo:Function = function ():LoggerInterface {
return new IrcLogger();
};
//
export = foo;*/
//# sourceMappingURL=IrcLogger.js.map
