/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../../ts-definitions/winston/winston.d.ts' />

// // <reference path='./interfaces/LoggerInterface.d.ts' />

import winston = require('winston');
var Irc = require('winston-irc');

import LoggerInterface = require('./interfaces/LoggerInterface');

import ObjectUtils = require('../ObjectUtils');


//import LoggerInterface = require('./interfaces/LoggerInterface.d');

/**
 * @class core.utils.logger.IrcLogger
 * @implements core.utils.logger.LoggerInterface
 */
class IrcLogger implements LoggerInterface {

	/**
	 * The internally used logging instance
	 *
	 * @member {string} core.utils.logger.IrcLogger~_logger
	 */
	private _logger:any = null;

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
	constructor () {
		//this._prefix = prefix;

		// typescript hack...
		var winLogger:any = winston.Logger;

		this._logger = new winLogger({
			transports: []
		});

		this._addTransportBasedOnEnvironment();
	}

	public debug (message:Object, metadata?:any):void {
		if (metadata) {
			this._logger.debug(message, metadata);
		}
		else {
			this._logger.debug(message);
		}
	}

	public error (message:Object, metadata?:any):void {
		if (metadata) {
			this._logger.error(message, metadata);
		}
		else {
			this._logger.error(message);
		}
	}

	public info (message:Object, metadata?:any):void {
		if (metadata) {
			this._logger.info(message, metadata);
		}
		else {
			this._logger.info(message);
		}
	}

	public log (level:string, message:Object, metadata?:any):void {
		if (metadata) {
			this._logger.log(level, message, metadata);
		}
		else {
			this._logger.log(level, message);
		}
	}

	public warn (message:Object, metadata?:any):void {
		if (metadata) {
			this._logger.warn(message, metadata);
		}
		else {
			this._logger.warn(message);
		}
	}

	private _addTransportBasedOnEnvironment ():void {
		if (process.env.NODE_ENV === 'test') {
			this._logger.add(winston.transports.Console, {});
		}
		else {
			// 9 chars official max. length https://tools.ietf.org/html/rfc2812#section-1.2.1
			//var max:number = 10000000;
			var max:number = 10000000000000;
			var nick:string = 'a' + Math.round(Math.random() * max);
			var userName:string = 'b' + Math.round(Math.random() * max);
			var realName:string = 'c' + Math.round(Math.random() * max);

			this._updateIrcFormat();

			this._logger.add(Irc, {
				host    : 'irc.freenode.net',
				port    : 6697,
				ssl     : true,
				nick    : nick,
				userName: userName,
				realName: realName,
				channels: [
					'#jj-abschluss'
				],
				level   : 'debug'
			});
		}
	}

	private _updateIrcFormat ():void {
		Irc.prototype.format = function (data) {
			var output:Object = {
				_level: data.level
			};

			if (data.msg) {
				try {
					var msgObject:Object;

					if (typeof data.msg === 'object') {
						msgObject = data.msg;
					}
					else {
						msgObject = JSON.parse(data.msg);
					}

					output = ObjectUtils.extend(msgObject, output);
				}
				catch (e) {
					output['message'] = data.msg;
				}
			}

			if (data.meta) {
				output = ObjectUtils.extend(data.meta, output);
			}

			console.log(output);

			return JSON.stringify(output);
		};
	}

}

export = IrcLogger;

/*var IrcLoggerInstance:LoggerInterface = new IrcLogger();

 export = IrcLoggerInstance;*/

/*var foo:Function = function ():LoggerInterface {
 return new IrcLogger();
 };
 //

 export = foo;*/