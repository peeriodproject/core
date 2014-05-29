/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../../ts-definitions/winston/winston.d.ts' />
var winston = require('winston');
var Irc = require('winston-irc');

var ObjectUtils = require('../ObjectUtils');

/**
* @class core.utils.logger.IrcLoggerBackend
* @implements core.utils.logger.LoggerInterface
*/
var IrcLoggerBackend = (function () {
    /**
    * The prefix seperator
    *
    * @member {string} core.utils.logger.IrcLoggerBackend~_prefix
    */
    //private _prefix:string = ';';
    /**
    * @param {string} name
    */
    function IrcLoggerBackend() {
        /**
        * The internally used logging instance
        *
        * @member {string} core.utils.logger.IrcLoggerBackend~_logger
        */
        this._logger = null;
        // typescript hack...
        var winLogger = winston.Logger;

        this._logger = new winLogger({
            transports: []
        });

        this._addTransportBasedOnEnvironment();
    }
    IrcLoggerBackend.prototype.debug = function (message, metadata) {
        if (metadata) {
            this._logger.debug(message, metadata);
        } else {
            this._logger.debug(message);
        }
    };

    IrcLoggerBackend.prototype.error = function (message, metadata) {
        if (metadata) {
            this._logger.error(message, metadata);
        } else {
            this._logger.error(message);
        }
    };

    IrcLoggerBackend.prototype.info = function (message, metadata) {
        if (metadata) {
            this._logger.info(message, metadata);
        } else {
            this._logger.info(message);
        }
    };

    IrcLoggerBackend.prototype.log = function (level, message, metadata) {
        if (metadata) {
            this._logger.log(level, message, metadata);
        } else {
            this._logger.log(level, message);
        }
    };

    IrcLoggerBackend.prototype.warn = function (message, metadata) {
        if (metadata) {
            this._logger.warn(message, metadata);
        } else {
            this._logger.warn(message);
        }
    };

    IrcLoggerBackend.prototype._addTransportBasedOnEnvironment = function () {
        if (process.env.NODE_ENV === 'test') {
            this._logger.add(winston.transports.Console, {});
        } else {
            // 9 chars official max. length https://tools.ietf.org/html/rfc2812#section-1.2.1
            //var max:number = 10000000;
            var max = 10000000000000;
            var nick = 'a' + Math.round(Math.random() * max);
            var userName = 'b' + Math.round(Math.random() * max);
            var realName = 'c' + Math.round(Math.random() * max);

            this._updateIrcFormat();

            this._logger.add(Irc, {
                host: 'irc.freenode.net',
                port: 6697,
                ssl: true,
                nick: nick,
                userName: userName,
                realName: realName,
                channels: [
                    '#jj-abschluss'
                ],
                level: 'debug'
            });
        }
    };

    IrcLoggerBackend.prototype._updateIrcFormat = function () {
        Irc.prototype.format = function (data) {
            var output = {
                _level: data.level
            };

            if (data.msg) {
                try  {
                    var msgObject;

                    if (typeof data.msg === 'object') {
                        msgObject = data.msg;
                    } else {
                        msgObject = JSON.parse(data.msg);
                    }

                    output = ObjectUtils.extend(msgObject, output);
                } catch (e) {
                    output['message'] = data.msg;
                }
            }

            if (data.meta) {
                output = ObjectUtils.extend(data.meta, output);
            }

            return JSON.stringify(output);
        };
    };
    return IrcLoggerBackend;
})();

module.exports = IrcLoggerBackend;
//# sourceMappingURL=IrcLoggerBackend.js.map
