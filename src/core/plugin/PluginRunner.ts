/// <reference path='../../main.d.ts' />

import fs = require('fs');
import path = require('path');

var SandCastle = require('sandcastle').SandCastle;

import ConfigInterface = require('../config/interfaces/ConfigInterface');
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

	private _sandbox = null;
	private _sandboxScripts = [];

	private _pluginCode:string = null;

	private _pluginGlobalsFactory:PluginGlobalsFactoryInterface = null;

	private _pluginScriptPath:string = null;

	// todo plugin-type PluginGlobalsFactory factory parameter
	constructor (config, identifier:string, pluginScriptPath:string) {
		this._config = config;
		this._pluginScriptPath = pluginScriptPath;

		// todo wait for node webkits child_process.spawn fix and remove own binary
		// we're using our own node binary as a temporary fix here!
		// @see https://github.com/rogerwang/node-webkit/issues/213
		var nodeBinaryPath:string = path.join(__dirname, '../../bin/', this._config.get('plugin.binaryPath'));

		this._sandbox = new SandCastle({
			memoryLimitMB: 100,
			timeout      : 10000,
			useStrictMode: true,
			api          : this._getPluginApiPath(),
			spawnExecPath: nodeBinaryPath
		});

		this._pluginGlobalsFactory = new PluginGlobalsFactory();
		this._pluginCode = fs.readFileSync(this._pluginScriptPath, 'utf-8');
	}

	public cleanup ():void {
		this._sandbox.kill();
		this._sandboxScripts = null;
		this._sandbox = null;
		this._pluginGlobalsFactory = null;
	}

	public getMapping (callback:Function):void {
		this._createAndRunStaticSandbox('main.getMapping', callback, function (output:any) {
			callback(null, output);
		});
	}

	public getSearchFields (callback:Function):void {
		this._createAndRunStaticSandbox('main.getSearchFields', callback, function (output:any) {
			callback(null, output);
		});
	}

	public onBeforeItemAdd (itemPath:string, stats:fs.Stats, globals:Object, callback:Function):void {
		this._createAndRunItemSandbox(itemPath, stats, globals, 'main.onBeforeItemAdd', callback, function (output:any) {
			callback(null, output);
		});
	}

	/**
	 * Creates a sandbox for a specified itemPath, registers a timeout handler, adds the onExit callback and runs the specified method name.
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
		this._createSandbox(itemPath);
		this._registerSandboxTimeoutHandler(itemPath, callback);
		this._registerSandboxExitHandler(itemPath, callback, onExit);

		this._sandboxScripts[itemPath].run(methodName, this._pluginGlobalsFactory.create(itemPath, stats, globals));
	}

	/**
	 * Creates a static sandbox for the specified methodName, registers a timeout handler, adds the onExit callback and runs the specified method name.
	 *
	 * @method core.plugin.PluginRunner~_createAndRunStaticSandbox
	 *
	 * @param {string} methodName
	 * @param {Function} callback
	 * @param {Function} onExit
	 */
	private _createAndRunStaticSandbox (methodName:string, callback:Function, onExit:(output:any) => void):void {
		this._createSandbox(methodName);
		this._registerSandboxTimeoutHandler(methodName, callback);
		this._registerSandboxExitHandler(methodName, callback, onExit);

		this._sandboxScripts[methodName].run(methodName);
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
	 * Registers a timeout handler for the sandbox which belongs to the given path
	 *
	 * @method core.plugin.PluginRunner~_registerSandboxTimeoutHandler
	 *
	 * @param {string} itemPath
	 * @param {Function} callback
	 */
	private _registerSandboxTimeoutHandler (itemPath:string, callback:Function):void {
		if (this._sandboxScripts[itemPath]) {
			this._sandboxScripts[itemPath].on('timeout', function (methodName) {
				callback(new Error('PluginRunner~registerSandboxTimeouthandler: The Plugin did not respond to a call "' + methodName), null);
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
			this._sandboxScripts[identifier].on('exit', function (err, output, methodName) {
				if (err) {
					return callback(err, null, methodName);
				}
				else {
					return onExit(output);
				}
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