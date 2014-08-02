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

	/**
	 * The base path to the apps root directory
	 *
	 * @member {string} core.utils.logger.IrcLoggerBackend~_basePath
	 */
	private _basePath:string = '';

	/**
	 * The internally used logging instance
	 *
	 * @member {string} core.utils.logger.IrcLoggerBackend~_logger
	 */
	private _logger:any = null;

	/**
	 * A flag indicates if the backend should use the irc or file logger
	 *
	 * @member {boolean} core.utils.logger.IrcLoggerBackend~_useIrc
	 */
	private _useIrc:boolean = false;


	constructor () {
		this._basePath = path.resolve(__dirname, '../../../');

		// typescript hack...
		var winLogger:any = winston.Logger;

		this._logger = new winLogger({
			transports: [],
			exitOnError: false,
			levels: {
				debug: 0,
				ping: 1,
				proxy: 2,
				findClosestNodes: 3,
				nodeSeeker: 4,
				hydra: 5,
				query: 6,
				topology: 7,
				network: 8,
				message: 9,
				routingTable: 10,
				search: 11,
				info: 12,
				error: 13,
				warn: 14,
				socket: 15,
				hydraSuccess: 16,
				hydraCell: 17,
				hydraReaction: 18,
				hydraExtension: 19,
				socketCount: 20,
				middleware: 21
			}
		});

		this._addTransportBasedOnEnvironment();
	}

	public debug (message:Object, metadata?:any):void {
		message = this._updateMessage(message);

		if (metadata) {
			this._logger.debug(message, metadata);
		}
		else {
			this._logger.debug(message);
		}
	}

	public error (message:Object, metadata?:any):void {
		message = this._updateMessage(message);

		if (metadata) {
			this._logger.error(message, metadata);
		}
		else {
			this._logger.error(message);
		}
	}

	public info (message:Object, metadata?:any):void {
		message = this._updateMessage(message);

		if (metadata) {
			this._logger.info(message, metadata);
		}
		else {
			this._logger.info(message);
		}
	}

	public log (level:string, message:Object, metadata?:any):void {
		message = this._updateMessage(message);

		if (metadata) {
			this._logger.log(level, message, metadata);
		}
		else {
			this._logger.log(level, message);
		}
	}

	public warn (message:Object, metadata?:any):void {
		message = this._updateMessage(message);

		if (metadata) {
			this._logger.warn(message, metadata);
		}
		else {
			this._logger.warn(message);
		}
	}

	private _addTransportBasedOnEnvironment ():void {
		if (process.env.NODE_ENV === 'test') {
			//this._logger.add(winston.transports.Console, {});
		}
		else if (this._useIrc) {
			// 9 chars official max. length https://tools.ietf.org/html/rfc2812#section-1.2.1
			//var max:number = 10000000;
			var max:number = 10000000000000;
			var nick:string = 'a' + Math.round(Math.random() * max);
			var userName:string = 'b' + Math.round(Math.random() * max);
			var realName:string = 'c' + Math.round(Math.random() * max);

			this._setupIrcFormat();

			/*this._logger.add(Irc, {
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
			 });*/

			this._logger.add(Irc, {
				host    : '192.168.178.37',
				port    : 6667,
				ssl     : false,
				nick    : nick,
				userName: userName,
				realName: realName,
				channels: [
					'#logs'
				],
				level   : 'debug'
			});
		}
		else {
			if (!process.env.DISABLE_FILE_LOGGER) {
				this._logger.add(winston.transports.File, {
					silent          : false,
					timestamp       : true,
					filename        : path.resolve('/Users/jj/Desktop/logs/a' + Math.round(Math.random() * 1000000000000) + '.log'),
					//filename : this._basePath + '/logs/a' + Math.round(Math.random() * 10000000000000),
					level           : 'debug',
					handleExceptions: true
				});
			}

			if (process.env.ENABLE_CONSOLE_LOGGER) {
				this._logger.add(winston.transports.Console, {
					silent          : false,
					timestamp       : false,
					level           : 'debug',
					handleExceptions: true
				});
			}
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

	/**
	 * Sets up the IRC logger format. It adds the log level, parses json strings and merges additional metadata to the final json output
	 *
	 * @method core.utils.logger.IrcLoggerBackend~_setupIrcFormat
	 */
	private _setupIrcFormat ():void {
		Irc.prototype.format = (data) => {
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
					output['_message'] = data.msg;
				}
			}

			if (data.meta) {
				output = ObjectUtils.extend(data.meta, output);
			}

			output = this._cleanupPaths(output);

			return JSON.stringify(output);
		};
	}

	private _updateMessage (message:Object):string {
		return (typeof message === 'string') ? <string>message : JSON.stringify(message);
	}

}

export = IrcLoggerBackend;