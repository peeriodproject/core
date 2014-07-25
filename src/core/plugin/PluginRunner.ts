/// <reference path='../../main.d.ts' />

import fs = require('fs');
import path = require('path');

var SandCastle = require('sandcastle').SandCastle;

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FileBlockReaderFactoryInterface = require('../fs/interfaces/FileBlockReaderFactoryInterface');
import FileBlockReaderInterface = require('../fs/interfaces/FileBlockReaderInterface');
import PluginInterface = require('./interfaces/PluginInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');
import PluginGlobalsFactoryInterface = require('./interfaces/PluginGlobalsFactoryInterface');

import PluginGlobalsFactory = require('./PluginGlobalsFactory');

/**
 * @class core.plugin.PluginRunner
 * @implements core.plugin.PluginRunnerInterface
 *
 * @params {core.config.ConfigInterface} config
 * @params {string} identifier todo remove identifer
 * @params {string} pluginScriptPath
 */
class PluginRunner implements PluginRunnerInterface {

	private _config:ConfigInterface = null;

	private _fileBlockReaderFactory:FileBlockReaderFactoryInterface = null;

	private _sandbox = null;

	private _sandboxScripts = {};

	private _sandboxSocketPath:string = '';

	private _pluginCode:string = null;

	private _pluginGlobalsFactory:PluginGlobalsFactoryInterface = null;

	private _pluginScriptPath:string = null;

	// todo plugin-type PluginGlobalsFactory factory parameter
	constructor (config, identifier:string, pluginScriptPath:string, fileBlockReaderFactory:FileBlockReaderFactoryInterface) {
		this._config = config;
		this._pluginScriptPath = pluginScriptPath;
		this._fileBlockReaderFactory = fileBlockReaderFactory;

		// todo wait for node webkits child_process.spawn fix and remove own binary
		// we're using our own node binary as a temporary fix here!
		// @see https://github.com/rogerwang/node-webkit/issues/213
		var nodeBinaryPath:string = path.join(__dirname, '../../bin/', this._config.get('plugin.binaryPath'));

		this._sandboxSocketPath = '/tmp/jjpluginrunner_' + Math.round(Math.random() * 1000).toString() + '.sock';

		this._sandbox = new SandCastle({
			memoryLimitMB: 1024,
			timeout      : this._config.get('plugin.timeoutInSeconds') * 1000,
			useStrictMode: true,
			api          : this._getPluginApiPath(),
			spawnExecPath: nodeBinaryPath,
			socket       : this._sandboxSocketPath
		});

		this._pluginGlobalsFactory = new PluginGlobalsFactory();
		this._pluginCode = fs.readFileSync(this._pluginScriptPath, 'utf-8');
	}

	// todo add a interval that cleans up old item sandboxes
	public cleanup ():void {
		this._sandbox.kill();
		this._sandboxScripts = null;
		this._sandbox = null;
		this._pluginGlobalsFactory = null;

		try {
			fs.unlinkSync(this._sandboxSocketPath);
		}
		catch (e) {
		}
	}

	public getMapping (callback:(err:Error, mapping:Object) => any):void {
		this._createAndRunStaticSandbox('main.getMapping', {}, callback, function (output:any):void {
			return callback(null, output);
		});
	}

	public getQuery (query:Object, callback:(err:Error, query:Object) => any):void {
		this._createAndRunStaticSandbox('main.getQuery', { query: query }, callback, function (output:any):void {
			return callback(null, output);
		});
	}

	public getResultFields (callback:(err:Error, fields:Object) => any):void {
		this._createAndRunStaticSandbox('main.getResultFields', {}, callback, function (output:any):void {
			return callback(null, output);
		});
	}

	public getSearchFields (callback:(err:Error, searchFields:Object) => any):void {
		this._createAndRunStaticSandbox('main.getSearchFields', {}, callback, function (output:any):void {
			return callback(null, output);
		});
	}

	public onBeforeItemAdd (itemPath:string, stats:fs.Stats, globals:Object, callback:Function):void {
		var methodName:string = 'main.onBeforeItemAdd';
		var sandboxKey:string = this._getSandboxKey(itemPath, methodName);
		var fileBlockReader:FileBlockReaderInterface = this._fileBlockReaderFactory.create(itemPath, this._config.get('plugin.pluginRunnerChunkSize'));
		var prevFileReadPosition:number = -1;
		var fileReadPosition:number = 0;

		var internalCallback = (err:Error, output:any):void => {
			if (err) {
				console.error(err);
			}

			if (this._sandboxScripts[sandboxKey]) {
				this._sandboxScripts[sandboxKey].removeAllListeners();
				this._sandboxScripts[sandboxKey] = null;
			}

			fileBlockReader.abort(function (readerErr) {
				err = err || readerErr;

				return callback(err, output);
			});
		};

		fileBlockReader.prepareToRead((err:Error):void => {
			if (err) {
				return internalCallback(err, null);
			}

			this._createItemSandbox(sandboxKey, internalCallback, function (output:any):void {
				return internalCallback(null, output);
			});

			this._sandboxScripts[sandboxKey].on('task', function (taskErr:Error, taskName:string, options:Object, methodName:string, taskCallback:(data) => void):void {
				if (err) {
					return internalCallback(err, null);
				}

				if (taskName !== 'getFileBuffer' || prevFileReadPosition === fileReadPosition) { // wrong task or end of file
					return;
				}

				fileBlockReader.readBlock(fileReadPosition, function (err:Error, readBytes:Buffer):void {
					if (err) {
						return internalCallback(err, null);
					}

					prevFileReadPosition = fileReadPosition;
					fileReadPosition += readBytes.length;

					return taskCallback(readBytes);
				});
			});

			this._sandboxScripts[sandboxKey].run(methodName, this._pluginGlobalsFactory.create(itemPath, stats, globals));
		});
	}

	/**
	 * Creates a sandbox via {@link core.plugin.PluginRunner~_createItemSandbox} and runs the specified method name.
	 *
	 * @method core.plugin.PluginRunner~_createAndRunItemSandbox
	 *
	 * @param {string} itemPath
	 * @param {fs.Stats} stats
	 * @param {Object} globals
	 * @param {string} methodName
	 * @param {Function} callback
	 * @param {Function} onExit
	 */
	private _createAndRunItemSandbox (itemPath:string, stats:fs.Stats, globals:Object, methodName:string, callback:Function, onExit:(output:any) => void):void {
		var sandboxKey:string = this._getSandboxKey(itemPath, methodName);

		this._createItemSandbox(sandboxKey, callback, onExit);

		this._sandboxScripts[sandboxKey].run(methodName, this._pluginGlobalsFactory.create(itemPath, stats, globals));
	}

	/**
	 * Creates a static sandbox for the specified methodName, registers a timeout handler, adds the onExit callback and runs the specified method name.
	 *
	 * @method core.plugin.PluginRunner~_createAndRunStaticSandbox
	 *
	 * @param {string} methodName
	 * @param {Object} globals
	 * @param {Function} callback
	 * @param {Function} onExit
	 */
	private _createAndRunStaticSandbox (methodName:string, globals, callback:Function, onExit:(output:any) => void):void {
		this._createSandbox(methodName);
		this._registerSandboxTimeoutHandler(methodName, callback);
		this._registerSandboxExitHandler(methodName, callback, onExit);

		this._sandboxScripts[methodName].run(methodName, globals);
	}

	/**
	 * Creates a sandbox for a specified key, registers a timeout handler and adds the onExit callback
	 *
	 * @method core.plugin.PluginRunner~_createItemSandbox
	 *
	 * @param {string} sandboxKey
	 * @param {Function} callback
	 * @param {Function} onExit
	 */
	private _createItemSandbox (sandboxKey:string, callback:Function, onExit:(output:any) => void):void {
		this._createSandbox(sandboxKey);
		this._registerSandboxTimeoutHandler(sandboxKey, callback);
		this._registerSandboxExitHandler(sandboxKey, callback, onExit);
	}

	/**
	 * Creates a sandbox for the given item path. Each sandbox provides a persistent state storage
	 * between lookups as long as the PluginRunner is active.
	 *
	 * @see core.plugin.PluginApi
	 *
	 * @method core.plugin.PluginRunner~_createSandbox
	 *
	 * @param {string} itemPath
	 */
	private _createSandbox (itemPath:string):void {
		if (!this._sandboxScripts[itemPath]) {
			this._sandboxScripts[itemPath] = this._sandbox.createScript(this._pluginCode);
		}
	}

	/**
	 * Returns the sandbox key for a specified item path & method name
	 *
	 * @method core.plugin.PluginRunner~_getSandboxKey
	 *
	 * @param {string} itemPath
	 * @param {string} methodName
	 * @returns {string}
	 */
	private _getSandboxKey (itemPath:string, methodName:string):string {
		return itemPath + '_' + methodName;
	}

	/**
	 * Registers a timeout handler for the sandbox which belongs to the given path
	 *
	 * @method core.plugin.PluginRunner~_registerSandboxTimeoutHandler
	 *
	 * @param {string} itemPath
	 * @param {Function} callback
	 */
	private _registerSandboxTimeoutHandler (itemPath:string, callback:Function):void {
		if (this._sandboxScripts[itemPath]) {
			this._sandboxScripts[itemPath].once('timeout', (methodName):void => {
				this._sandboxScripts[itemPath].reset();
				return callback(new Error('PluginRunner~registerSandboxTimeouthandler: The Plugin did not respond to a call "' + methodName), null);
			});
		}
	}

	/**
	 * Binds a `exit` handler to the event. It calls the specified callback on error, or the onExit method after the sandbox finished it's run.
	 *
	 * @method core.plugin.PluginRunner~_registerSandboxExitHandler
	 *
	 * @param {string} identifier
	 * @param {Function} callback
	 * @param {Function} onExit
	 */
	private _registerSandboxExitHandler (identifier:string, callback:Function, onExit:(output:any) => void):void {
		if (this._sandboxScripts[identifier]) {
			this._sandboxScripts[identifier].once('exit', (err, output, methodName):void => {
				this._sandboxScripts[identifier].reset();

				if (err) {
					return callback(err, null, methodName);
				}

				return onExit(output);
			});
		}
	}

	/**
	 * Returns an absolute path to the PluginApi file
	 *
	 * @method core.plugin.PluginRunner~_getPluginApiPath
	 *
	 * @returns {string}
	 */
	private _getPluginApiPath ():string {
		return path.resolve(this._config.get('plugin.api.basePath'), this._config.get('plugin.api.pluginApiName'));
	}

}

export = PluginRunner;