/// <reference path='../../main.d.ts' />

var i18n = require('i18n');

import UiSplashScreenInterface = require('./interfaces/UiSplashScreenInterface');

/**
 * @class core.ui.UiSplashScreen
 * @implements core.ui.UiSplashScreenInterface
 */
class UiSplashScreen implements UiSplashScreenInterface {

	// todo ts-declaration gui.Window
	private _window = null;

	private _isOpen:boolean = false;

	private _currentStatus:string = '';

	constructor(gui:any) {
		this._window = gui.Window.open('./public/splash-screen.html', {
			position: 'center',
			width: 720,
			height: 400,
			frame: false,
			toolbar: false,
			resizable: false,
			show: false
		});

		this._window.once('loaded', () => {
			this._window.showDevTools();
			this._updateStatus();
			this.open();
		});
	}

	public close ():void {
		this._window.close(true);
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		this._window.show();
		this._window.focus();

		this._isOpen = true;
	}

	public setStatus (status:string):void {
		this._currentStatus = status;

		if (this.isOpen()) {
			this._updateStatus();
		}
	}

	private _updateStatus ():void {
		this._window.window.document.getElementById('status').innerHTML = i18n.__('splashScreen.' + this._currentStatus);
	}

}

export = UiSplashScreen;