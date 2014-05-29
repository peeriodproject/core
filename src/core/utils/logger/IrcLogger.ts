/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import path = require('path');
var stackTrace = require('stack-trace');

import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLoggerBackend = require('./IrcLoggerBackend');
import ObjectUtils = require('../ObjectUtils');

/**
 * @class core.utils.logger.IrcLogger
 * @implements core.utils.logger.LoggerInterface
 */
class IrcLogger implements LoggerInterface {

	private _basePath:string = '';

	/**
	 * The internally used irc backend instance
	 *
	 * @member {string} core.utils.logger.IrcLogger~_backend
	 */
	private _backend:LoggerInterface = null;

	private _uuid:string = '';

	/**
	 * The prefix seperator
	 *
	 * @member {string} core.utils.logger.IrcLogger~_prefix
	 */
	//private _prefix:string = ';';
	/**
	 * @param {string} name
	 */
	constructor (logger:LoggerInterface) {
		// @see http://stackoverflow.com/a/105074
		var generateUuid:Function = (function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000)
					.toString(16)
					.substring(1);
			}
			return function():string {
				return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
					s4() + '-' + s4() + s4() + s4();
			};
		})();

		this._basePath = path.join(__dirname, '../../../../');
		this._backend = logger;
		this._uuid = generateUuid();
	}

	public debug (message:Object, metadata?:any):void {
		this._backend.debug(message, metadata);
	}

	public error (message:Object, metadata?:any):void {
		this._backend.error(message, metadata);

	}

	public info (message:Object, metadata?:any):void {
		metadata = this._updateMetadata(metadata);
		this._backend.info(message, metadata);

	}

	public log (level:string, message:Object, metadata?:any):void {
		metadata = this._updateMetadata(metadata);

		this._backend.log(level, message, metadata);

	}

	public warn (message:Object, metadata?:any):void {
		this._backend.warn(message, metadata);
	}

	private _updateMetadata(metadata:Object = {}):Object {
		var stack = stackTrace.get();

		var functionName:string = '';

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
	}
}

export = IrcLogger;