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
 * @see https://github.com/KyleJune/udibo-sandbox
 *
 * @class core.plugin.PluginRunner
 * @implements core.plugin.PluginRunnerInterface
 *
 * @params {core.config.ConfigInterface} config
 * @params {string} identifier todo remove identifer
 * @params {plugnScriptPath}
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
			timeout      : 5000,
			useStrictMode: true,
			api          : this._getPluginApiPath()
		});
		this._pluginGlobalsFactory = new PluginGlobalsFactory();
		this._pluginCode = fs.readFileSync(this._pluginScriptPath, 'utf-8');

		/*this._sandboxScript = this._sandbox.createScript(script);

		 var foo = false;
		 // todo begin independent methods
		 var globals:Object = this._pluginGlobalsFactory.create(null, null) || {};

		 this._sandboxScript.on('exit', (err, output, methodName) => {
		 /*console.log('--- EXIT ---');
		 if (err) {
		 console.log(err.message);
		 console.log(err.stack);
		 }
		 console.log('methodName', methodName);
		 console.log(output);

		 if (!foo) {
		 this._sandboxScript.run('main.onTest', Object.freeze(globals));
		 foo = true;
		 }* /
		 //this._sandboxScript.reset();
		 });

		 this._sandboxScript.on('timeout', function () {
		 //console.log('--- TIMEOUT ---');
		 //console.log('I timed out, oh what a silly script I am!');
		 });

		 this._sandboxScript.run('main.onInit', Object.freeze(globals));
		 /*this._sandboxScript.run('onInit');
		 this._sandboxScript.run('onInit', {
		 foo: "bar"
		 });* /
		 */
	}

	public cleanup ():void {
		for (var key in this._sandboxScripts) {
			// todo ts-definitions
			//this._sandboxScripts.reset();
		}

		this._sandboxScripts = null;
		this._sandbox = null;
		this._pluginGlobalsFactory = null;
	}

	onBeforeItemAdd (itemPath:string, stats:fs.Stats, callback:Function):void {
		var script = this._createSandbox(itemPath);

		this._registerSandboxErrorAndTimeoutHandler(itemPath, callback);

		script.on('exit', function (err:Error, output, methodName:string) {
			// todo check ob exit auch nach einem timeout getriggert wird
			if (err) {
				// todo handle error
				callback(err, null);
			}
			else {
				callback(null, output);
			}
		});

		script.run('main.onBeforeItemAdd', this._pluginGlobalsFactory.create(itemPath, stats));
	}

	/**
	 * Creates a sandbox for the given item path. Each sandbox provides a persistent state
	 * between lookups as long as the PluginRunner is active.
	 *
	 * @method core.plugin.PluginRunner~_createSandbox
	 *
	 * @param {string} itemPath
	 * @returns {any}
	 */
	private _createSandbox (itemPath) {
		return this._sandboxScripts[itemPath] ? this._sandboxScripts[itemPath] : this._sandbox.createScript(this._pluginCode);
	}

	/**
	 * Registers a error an timeout handler for the sandbox which belongs to the given path
	 *
	 * @method core.plugin.PluginRunner~_registerSandboxErrorAndTimeoutHandler
	 *
	 * @param {string} itemPath
	 * @param {Function} callback
	 */
	private _registerSandboxErrorAndTimeoutHandler (itemPath, callback:Function) {
		if (this._sandboxScripts[itemPath]) {
			this._sandboxScripts[itemPath].on('timeout', function () {
				// todo callback
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