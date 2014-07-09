/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import path = require('path');
var stackTrace = require('stack-trace');

import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import LoggerInterface = require('./interfaces/LoggerInterface');

import IrcLoggerBackend = require('./IrcLoggerBackend');
import ObjectUtils = require('../ObjectUtils');

/**
 * @class core.utils.logger.IrcLogger
 * @implements core.utils.logger.LoggerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {string} uuid
 * @param {core.utils.LoggerInterface} logger
 */
class IrcLogger implements LoggerInterface {

	private _basePath:string = '';

	/**
	 * The internally used irc backend instance
	 *
	 * @member {string} core.utils.logger.IrcLogger~_backend
	 */
	private _backend:LoggerInterface = null;

	private _config:ConfigInterface = null;

	private _simulator:Object = {};

	private _uuid:string = '';

	constructor (config:ConfigInterface, uuid:string, logger:LoggerInterface) {
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

		this._config = config;
		this._basePath = path.join(__dirname, '../../../../');
		this._backend = logger;
		this._uuid = uuid || generateUuid();

		try {
			var country = this._config.get('net.simulator.location.country');
			this._simulator['country'] = country;
		}
		catch (e) {
		}

		try {
			var delay = this._config.get('net.simulator.location.delay');
			this._simulator['delay'] = delay;
		}
		catch (e) {
		}

		try {
			var location = this._config.get('net.simulator.location.lat') + ',' + this._config.get('net.simulator.location.lng');
			this._simulator['location'] = location;
		}
		catch (e) {
		}

		if (Object.keys(this._simulator).length) {
			this._backend.debug('simulator settings', { _uuid: this._uuid, _simulator: this._simulator });
		}
	}

	public debug (message:Object, metadata?:any):void {
		metadata = this._updateMetadata(metadata);

		this._backend.debug(message, metadata);
	}

	public error (message:Object, metadata?:any):void {
		metadata = this._updateMetadata(metadata);

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
		metadata = this._updateMetadata(metadata);

		this._backend.warn(message, metadata);
	}

	private _updateMetadata(metadata:Object = {}):Object {
		var stack = stackTrace.get();

		var functionName:string = '';

		// todo proper for loop!
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

		var additionalData:Object = {
			_caller: functionName,
			_uuid: this._uuid,
			process: {
				pid: process.pid
			}
		};

		return ObjectUtils.extend(metadata, additionalData);
	}
}

export = IrcLogger;