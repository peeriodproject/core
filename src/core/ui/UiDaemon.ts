/// <reference path='../../main.d.ts' />


import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import UiDaemonInterface = require('./interfaces/UiDaemonInterface');

var i18n = require('i18n');

/**
 * @class core.ui.UiDaemon
 * @implements core.ui.UiDaemonInterface
 */
class UiDaemon implements UiDaemonInterface {

	private _aboutWindow = null;

	private _menu = null;

	private _tray = null;

	constructor (gui, appQuitHandler:AppQuitHandlerInterface) {
		this._tray = new gui.Tray({
			icon   : './images/icon-menubar.png',
			alticon: './images/icon-menubar-active.png'
		});

		this._menu = new gui.Menu();

		var aboutItem = new gui.MenuItem({
			label: i18n.__('UiDaemon.menu.about.title')
		});

		aboutItem.click = () => {
			if (this._aboutWindow) {
				this._aboutWindow.show();
				this._aboutWindow.focus();

				return;
			}

			this._aboutWindow = gui.Window.open('./public/about.html', {
				position       : 'center',
				focus          : true,
				toolbar        : false,
				frame          : true,
				resizable      : false,
				width          : 400,
				height         : 470,
				fullscreen     : false,
				show_in_taskbar: false
			});

			this._aboutWindow.setAlwaysOnTop(true);

			this._aboutWindow.once('close', () => {
				this._aboutWindow = null;
			});
		};

		this._menu.append(aboutItem);

		this._menu.append(new gui.MenuItem({
			type: 'separator'
		}));

		var quitItem = new gui.MenuItem({
			label: i18n.__('UiDaemon.menu.quit.title')
		});

		quitItem.click = function () {
			appQuitHandler.quit();
		};

		this._menu.append(quitItem);

		this._tray.menu = this._menu;
	}

	public getTray ():any {
		return this._tray;
	}
}

export = UiDaemon;