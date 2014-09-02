/// <reference path='../../main.d.ts' />


import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import UiDaemonInterface = require('./interfaces/UiDaemonInterface');

var i18n = require('i18n');

/**
 * @class core.ui.UiDaemon
 * @implements core.ui.UiDaemonInterface
 */
class UiDaemon implements UiDaemonInterface {

	private _menu = null;

	private _tray = null;

	constructor (gui, appQuitHandler:AppQuitHandlerInterface) {
		this._tray = new gui.Tray({
			title: 'A' //i18n.__('UiDaemon.trayTitle'),
			//icon : 'icon.png'
		});

		this._menu = new gui.Menu();

		/*menu.append(new gui.MenuItem({
		 type: 'separator'
		 }));*/
		var quitItem = new gui.MenuItem({
			label: 'Quit' //i18n.__('UiDaemon.menu.quit.title')
		});

		quitItem.click = function () {
			appQuitHandler.quit();
		};

		this._menu.append(quitItem);

		this._tray.menu = this._menu;

		console.log('added ui deamon');

		/*if (process.env.UI_ENABLED) {
		App.quit();
		}
		else {
		setTimeout(function () {
		App.quit();
		}, 40000);
		}* /
		};
		*/
	}

	public getTray ():any {
		return this._tray;
	}
}

export = UiDaemon;