/// <reference path='../../../main.d.ts' />

import path = require('path');
import fs = require('fs-extra');
import childProcess = require('child_process');

var i18n = require('i18n');

import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import UiRoutineInterface = require('../interfaces/UiRoutineInterface');

var logger = require('../../utils/logger/LoggerFactory').create();

class UiChromeExtensionRoutine implements UiRoutineInterface {

	private _config:ConfigInterface = null;

	constructor (config:ConfigInterface) {
		this._config = config;
	}

	public getDescription ():string {
		return this._geti18n('description');
	}

	public getIcon () {
		return this._config.get('extension.icon');
	}

	public getId ():string {
		return this._config.get('extension.id');
	}

	public getName ():string {
		return this._geti18n('name');
	}

	getInstallButtonLabel ():string {
		return this._geti18n('installButtonLabel');
	}

	public install (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		this.isInstalled((installed:boolean) => {
			if (installed) {
				return internalCallback(null);
			}

			var installPath = this._getInstallPath();

			logger.log('Chrome routing extension install path ' + path.resolve(process.cwd(), this._config.get('extension.crxPath')));

			fs.outputJson(installPath, {
				external_crx: path.resolve(process.cwd(), this._config.get('extension.crxPath')),
				external_version: this._config.get('extension.version')
			}, function (err) {

				return internalCallback(err);
			});
		});
	}

	public isInstalled (callback:(installed:boolean) => any):void {
		fs.exists(this._getInstallPath(), callback);
	}

	public start (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		var host:string = this._config.get('extension.host');
		var url:string = this._config.get('extension.hostUrl');

		url = 'file://' + path.resolve(path.join(process.cwd(), url));

		// todo windows starter
		// todo pull request to node.d.ts -> exec.unref
		// todo pull request to node.d.ts -> exec with a single argument
		/*var exec:any = childProcess.exec('open -a "' + host + '" "' + url + '"', function () {});
		exec.unref();*/

		return internalCallback(null);
	}

	public stop (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		return process.nextTick(callback.bind(null, new Error('UiChromeExtensionRoutine#stop: Can not stop "Google Chrome" programmatically. The user must close the browser manually.')));
	}

	public uninstall (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		fs.unlink(this._getInstallPath(), internalCallback);
	}

	private _geti18n (key:string):string {
		return i18n.__(this.getId() + '.' + key);
	}

	private _getInstallPath ():string {
		var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

		return path.resolve(path.join(home, this._config.get('extension.installPath'), this._config.get('extension.extensionId') + '.json'))
	}

}

export = UiChromeExtensionRoutine;