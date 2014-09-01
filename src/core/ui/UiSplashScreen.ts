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

	/**
	 * A flag indicates whether the splash screen is open or closed
	 *
	 * @member {boolean} core.ui.UiSplashScreen~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * A counter that increments on every status update and is used to decide which DOM element should be updated
	 *
	 * @member {boolean} core.ui.UiSplashScreen~_updateCounter
	 */
	private _updateCounter:number = 0;

	/**
	 * A list of pending status items that will be processed by the {@link core.ui.SplashScreen~_statusUpdateTimeout}
	 *
	 * @member {Array} core.ui.UiSplashScreen~_pendingStatusList
	 */
	private _pendingStatusList:Array<string> = [];

	/**
	 * Stores the current status update timeout
	 *
	 * @member {NodeJS.Timer} core.ui.UiSplashScreen~_statusUpdateTimeout
	 */
	private _statusUpdateTimeout:number = null;

	constructor(gui:any) {
		super();

		this._window = gui.Window.open('./public/splash-screen.html', {
			position: 'center',
			width: 720,
			height: 400,
			frame: false,
			toolbar: false,
			resizable: false,
			show: false,
			show_in_taskbar: false
		});

		this._window.once('loaded', () => {
			this._window.moveBy(0, 200);
			this._updateStatus();
			this.open();
		});
	}

	public close ():void {
		this._window.hide();

		this._isOpen = false;

		if (this._statusUpdateTimeout) {
			global.clearTimeout(this._statusUpdateTimeout);
			this._statusUpdateTimeout = null;
		}

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
		this._pendingStatusList.push(status);

		if (this.isOpen()) {
			this._startUpdateStatusInterval();
		}
	}

	/**
	 * Creates the status update interval and updates the initial status
	 *
	 * @method core.ui.UiSplashScreen~_startUpdateStatusInterval
	 */
	private _startUpdateStatusInterval ():void {
		if (this._statusUpdateTimeout) {
			return;
		}

		this._statusUpdateTimeout = global.setTimeout(() => {
			if (this._pendingStatusList.length) {
				this._updateStatus();
				this._statusUpdateTimeout = null;

				this._startUpdateStatusInterval();
			}
		}, 3000);

		this._updateStatus();
	}

	/**
	 * Updates the status by using an even or odd DOM element to simply cross-fade to the next status in the pending status list
	 *
	 * @method core.ui.UiSplashScreen~_updateStatus
	 */
	private _updateStatus ():void {
		if (!this._pendingStatusList.length) {
			return;
		}

		this._updateCounter++;

		var isEven:boolean = this._updateCounter % 2 === 0 ? true : false;
		var element:string = isEven ? 'status-even' : 'status-odd';

		this._window.window.document.getElementById('progress-wrapper').className = isEven ? 'even' : 'odd';
		this._window.window.document.getElementById(element).innerHTML = i18n.__('splashScreen.' + this._pendingStatusList.shift());
	}

}

export = UiSplashScreen;