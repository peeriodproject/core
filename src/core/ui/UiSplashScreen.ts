/// <reference path='../../main.d.ts' />

import events = require('events');

var i18n = require('i18n');

import UiSplashScreenInterface = require('./interfaces/UiSplashScreenInterface');

/**
 * @class core.ui.UiSplashScreen
 * @implements core.ui.UiSplashScreenInterface
 */
class UiSplashScreen extends events.EventEmitter implements UiSplashScreenInterface {

	// todo ts-declaration gui.Window
	private _window = null;

	private _isOpen:boolean = false;

	private _currentStatus:string = '';

	constructor(gui:any) {
		super();

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
			this._window.moveBy(0, 200);
			this._updateStatus();
			this.open();
		});
	}

	public close ():void {
		//this._window.close(true);
		this._window.hide();

		this._isOpen = false;

		this.emit('close');
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		this._window.show();
		this._window.focus();

		this._isOpen = true;

		this.emit('open');
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