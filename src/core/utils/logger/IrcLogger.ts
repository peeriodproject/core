/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../../ts-definitions/winston/winston.d.ts' />

// // <reference path='./interfaces/LoggerInterface.d.ts' />

import LoggerInterface = require('./interfaces/LoggerInterface');

import winston = require('winston');

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
	constructor() {
		//this._prefix = prefix;

		// typescript hack...
		var winLogger:any = winston.Logger;

		this._logger = new winLogger({
			transports: []
		});

		this._addTransportBasedOnEnvironment();

		this.info('irc logger created');
	}

	public debug (message:string, metadata?:any):void {
		message = this._addPrefix(message);

		if (metadata) {
			this._logger.debug(message, metadata);
		}
		else {
			this._logger.debug(message);
		}
	}

	public error (message:string, metadata?:any):void {
		message = this._addPrefix(message);

		this._logger.error(message, metadata);
	}

	public info (message:string, metadata?:any):void {
		message = this._addPrefix(message);

		if (metadata) {
			this._logger.info(message, metadata);
		}
		else {
			this._logger.info(message);
		}
	}

	public log (level:string, message:string, metadata?:any):void {
		message = this._addPrefix(message);

		if (metadata) {
			this._logger.log(level, message, metadata);
		}
		else {
			this._logger.log(level, message);
		}
	}

	public warn (message:string, metadata?:any):void {
		message = this._addPrefix(message);

		if (metadata) {
			this._logger.warn(message, metadata);
		}
		else {
			this._logger.warn(message);
		}
	}

	private _addPrefix(message:string) {
		return message; //this._prefix + ': ' + message;
	}

	private _addTransportBasedOnEnvironment ():void  {
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

			this._logger.add(require('winston-irc'), {
				host    : 'irc.freenode.net',
				port    : 6697,
				ssl     : true,
				nick    : nick,
				userName: userName,
				realName: realName,
				channels: [
					'#jj-abschluss'
				],
				onError: function (err:Error) {
					//console.log('--- IRC ERROR ---');
					//console.log(err);
				}
			});
		}
	}

}

//export = IrcLogger;

var IrcLoggerInstance:LoggerInterface = new IrcLogger();

export = IrcLoggerInstance;

/*var foo:Function = function ():LoggerInterface {
	return new IrcLogger();
};
//

export = foo;*/