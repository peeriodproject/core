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
 * @params {string} plugnScriptPath
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

		this._sandbox = new SandCastle({
			memoryLimitMB: 100,
			timeout      : 2000,
			useStrictMode: true,
			api          : this._getPluginApiPath()
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
		this._createAndRunSandbox(null, null, null, 'main.getMapping', callback, function (output:any) {
			callback(null, output);
		});
	}

	public onBeforeItemAdd (itemPath:string, stats:fs.Stats, tikaGlobals:Object, callback:Function):void {
		this._createAndRunSandbox(itemPath, stats, tikaGlobals, 'main.onBeforeItemAdd', callback, function (output:any) {
			callback(null, output);
		});
	}

	/**
	 * Creates a sandbox, registers a timeout handler, addes the onExit callback and runs the specified method name.
	 *
	 * @method core.plugin.PluginRunner~_createAndRunSandbox
	 *
	 * @param {string} itemPath
	 * @param {fs.Stats} stats
	 * @param {Object} tikaGlobals
	 * @param {string} methodName
	 * @param {Function} callback
	 * @param {Function} onExit
	 */
	private _createAndRunSandbox (itemPath:string, stats:fs.Stats, tikaGlobals:Object, methodName:string, callback:Function, onExit:(output:any) => void):void {
		this._createSandbox(itemPath);
		this._registerSandboxTimeoutHandler(itemPath, callback);
		this._sandboxScripts[itemPath].on('exit', function (err, output, methodName) {
			if (err) {
				return callback(err, null, methodName);
			}
			else {
				return onExit(output);
			}
		});
		this._sandboxScripts[itemPath].run(methodName, this._pluginGlobalsFactory.create(itemPath, stats, tikaGlobals));
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