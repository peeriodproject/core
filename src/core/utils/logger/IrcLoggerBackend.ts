/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../../ts-definitions/winston/winston.d.ts' />

import path = require('path');

import winston = require('winston');
var Irc = require('winston-irc');

import LoggerInterface = require('./interfaces/LoggerInterface');

import ObjectUtils = require('../ObjectUtils');

/**
 * @class core.utils.logger.IrcLoggerBackend
 * @implements core.utils.logger.LoggerInterface
 */
class IrcLoggerBackend implements LoggerInterface {

	private _basePath:string = '';

	/**
	 * The internally used logging instance
	 *
	 * @member {string} core.utils.logger.IrcLoggerBackend~_logger
	 */
	private _logger:any = null;

	/**
	 * The prefix seperator
	 *
	 * @member {string} core.utils.logger.IrcLoggerBackend~_prefix
	 */
	//private _prefix:string = ';';
	/**
	 * @param {string} name
	 */
	constructor () {
		this._basePath = path.join(__dirname, '../../../../');

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

	/**
	 * Removes the basePath from the dataObject by using JSON stringify and pars
	 *
	 * @method core.utils.logger.IrcLoggerBackend~_cleanupPaths
	 *
	 * @param {Object} data
	 * @returns {Object}
	 */
	private _cleanupPaths (data:Object):Object {
		var jsonString:string = JSON.stringify(data);

		jsonString = jsonString.replace(new RegExp(this._basePath, 'g'), '');
		jsonString = jsonString.replace('app.nw/', '');

		return JSON.parse(jsonString);
	}

	private _updateIrcFormat ():void {
		Irc.prototype.format = (data) => {
			var output:Object = {
				_level: data.level
			};

			if (data.msg) {
				try {
					var msgObject:Object;

					/*if (typeof data.msg === 'string') {
						msgObject = { _message: data.msg };
					}
					else */if (typeof data.msg === 'object') {
						msgObject = data.msg;
					}
					else {
						msgObject = JSON.parse(data.msg);
					}

					console.log('merging');
					output = ObjectUtils.extend(msgObject, output);
				}
				catch (e) {
					console.log('setting msg to _message');
					output['_message'] = data.msg;
				}
			}

			console.log(output);

			if (data.meta) {
				output = ObjectUtils.extend(data.meta, output);
			}

			output = this._cleanupPaths(output);
			console.log(output);

			return JSON.stringify(output);
		};
	}

}

export = IrcLoggerBackend;