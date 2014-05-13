/// <reference path='../../main.d.ts' />

var Sandbox = require('udibo-sandbox');

import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');

/**
 * @see https://github.com/KyleJune/udibo-sandbox
 *
 * @class core.plugin.PluginRunner
 * @implements core.plugin.PluginRunnerInterface
 */
class PluginRunner implements PluginRunnerInterface {


	private _sandbox = null;

	constructor (identifier:string, path:string) {
		this._sandbox = new Sandbox();
		this._sandbox.addVm(identifier, path);
	}

	public runPlugin (identifier:string):void {
		this._sandbox.reload();
	}
}

export = PluginRunner;