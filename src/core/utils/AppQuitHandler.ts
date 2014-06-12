/// <reference path='../../../ts-definitions/node-webkit/node-webkit.d.ts' />

import gui = require('nw.gui');

import AppQuitHandlerInterface = require('./interfaces/AppQuitHandlerInterface');

/**
 * @class core.utils.AppQuitHandler
 * @implements core.utils.AppQuitHandlerInterface
 *
 * @param {nw.gui.App} app
 */
class AppQuitHandler implements AppQuitHandlerInterface {

	/**
	 * The node-webkit App instance which should be closed.
	 *
	 * @member {nw.gui.App} core.utils.AppQuitHandler~_app
	 */
	private _app:gui.App = null;

	/**
	 * A list of functions that will be called before the app closes
	 *
	 * @member {Array<Function>} core.utils.AppQuitHandler~_callbacks
	 */
	private _callbacks:Array<Function> = [];

	/**
	 * A simple counter that increments whenever a callback calls the done method.
	 *
	 * @member {number} core.utils.AppQuitHandler~_callbacksDoneCounter
	 */
	private _callbacksDoneCounter:number = 0;

	constructor(app:gui.App) {
		this._app = app;
	}

	public add (callback:(done:(err?:Error) => any) => any):void {
		if (this._callbacks.indexOf(callback) === -1) {
			this._callbacks.push(callback);
		}
	}

	public quit ():void {
		if (!this._callbacks.length) {
			return this._checkAndQuit();
		}

		for (var i in this._callbacks) {
			this._callbacks[i](() => {
				this._callbackDone();
			});
		}
	}

	public remove (callback:(done:(err?:Error) => any) => any):void {
		var index = this._callbacks.indexOf(callback);

		if (index !== -1) {
			this._callbacks.splice(index, 1);
		}
	}

	private _callbackDone ():void {
		this._callbacksDoneCounter++;

		this._checkAndQuit();
	}

	private _checkAndQuit ():void {
		if (this._callbacks.length === this._callbacksDoneCounter) {
			this._app.quit();
		}
	}
}

export = AppQuitHandler;