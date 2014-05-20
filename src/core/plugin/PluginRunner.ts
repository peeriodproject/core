/// <reference path='../../main.d.ts' />

import fs = require('fs');
import path = require('path');

var SandCastle = require('sandcastle').SandCastle;

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');

import PluginGlobalsFactory = require('./PluginGlobalsFactory');

/**
 * @see https://github.com/KyleJune/udibo-sandbox
 *
 * @class core.plugin.PluginRunner
 * @implements core.plugin.PluginRunnerInterface
 */
class PluginRunner implements PluginRunnerInterface {

	private _config:ConfigInterface = null;

	private _sandbox = null;
	private _sandboxScript = null;

	// todo plugin-type PluginGlobalsFactory factory parameter
	constructor (config, identifier:string, pluginScriptPath:string) {
		this._config = config;
		this._sandbox = new SandCastle({
			memoryLimitMB: 100,
			timeout      : 5000,
			useStrictMode: true,
			api: this._getPluginApiPath()
		});

		var script = fs.readFileSync(pluginScriptPath, 'utf-8');
		console.log(script);
		this._sandboxScript = this._sandbox.createScript(script);

		var foo = false;
		// todo begin independen method
		var globals:Object = new PluginGlobalsFactory().create() || {};

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
			}*/
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
		 });*/
	}

	private _getPluginApiPath():string {
		return path.resolve(this._config.get('plugin.api.basePath'), this._config.get('plugin.api.pluginApiName'));
	}
}

export = PluginRunner;