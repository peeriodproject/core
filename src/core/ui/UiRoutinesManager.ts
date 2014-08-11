/// <reference path='../../main.d.ts' />

var i18n = require('i18n');

import UiRoutineInterface = require('./interfaces/UiRoutineInterface');
import UiRoutineListInterface = require('./interfaces/UiRoutineListInterface');
import UiRoutinesManagerInterface = require('./interfaces/UiRoutinesManagerInterface');

/**
 * @class core.ui.UiRoutinesManager
 * @implements core.ui.UiRoutinesManagerInterface
 */
class UiRoutinesManager implements UiRoutinesManagerInterface {

	private _isOpen:boolean = false;

	private _loaded:boolean = false;

	private _routines:UiRoutineListInterface = [];

	private _window = null;

	constructor (gui) {
		this._window = gui.Window.open('./public/ui-routines-installer.html', {
			position: 'center',
			width: 720,
			height: 400,
			frame: true,
			toolbar: false,
			resizable: true,
			show: false
		});

		this._window.once('loaded', () => {
			//this._window.showDevTools();
			//this._window.moveBy(0, 200);
			//this._updateStatus();
			this._updateWindow();

			this._loaded = true;

			if (this._isOpen) {
				this.open();
			}
		});
	}

	public addUiRoutine (routine:UiRoutineInterface):void {
		if (this.getUiRoutine(routine.getId()) === null) {
			this._routines.push(routine);
		}
	}

	public close ():void {
		this._window.close(true);
		//this._window.hide();

		this._isOpen = false;
	}

	getInstalledRoutineIds (callback:(err:Error, routinesIds:Array<string>) => any):void {
		var installedRoutines:Array<string> = [];
		var returned:number = 0;
		var checkAndReturn = () => {
			if (returned === this._routines.length) {
				returned = -1;

				return callback(null, installedRoutines);
			}
		};

		this._routines.forEach(function (routine) {
			routine.isInstalled(function (isInstalled) {
				if (isInstalled) {
					installedRoutines.push(routine.getId());
				}

				returned++;

				return checkAndReturn();
			});
		});

		//return process.nextTick(callback.bind(null, null, []));
	}

	public getUiRoutines ():UiRoutineListInterface {
		return this._routines.slice();
	}

	public getUiRoutine (routineId:string):UiRoutineInterface {
		for (var i = 0, l = this._routines.length; i < l; i++) {
			if (this._routines[i].getId() === routineId) {
				return this._routines[i];
			}
		}

		return null;
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		if (this._loaded) {
			this._window.show();
			this._window.focus();
		}

		this._isOpen = true;
	}

	private _clickInstallRoutineButton (event):void {
		event.preventDefault();

		var routine = this.getUiRoutine(event.target.getAttribute('data-id'));

		if (!routine) {
			return;
		}

		routine.install((err) => {
			if (!err) {
				this.close();

				routine.start();
			}
			else {
				console.error(err);
			}
		});
	}

	private _updateWindow ():void {
		this.getInstalledRoutineIds((err, ids) => {
			var routines = this.getUiRoutines();
			var doc = this._window.window.document;
			var onClick = (event) => {
				event.target.removeEventListener(onClick);

				this._clickInstallRoutineButton(event);
			};

			doc.getElementById('headline').innerHTML = i18n.__('uiRoutinesManager.installRoutinesHeadline');
			doc.getElementById('description').innerHTML = i18n.__('uiRoutinesManager.installRoutinesDescription');

			for (var i = 0, l = routines.length; i < l; i++) {
				var routine = routines[i];

				if (ids.indexOf(routine.getId()) !== -1) {
					routine = null;

					continue;
				}

				var item = doc.createElement('li');
				var heading = doc.createElement('h2');
				var desc = doc.createElement('p');
				var link = doc.createElement('a');

				heading.appendChild(doc.createTextNode(routine.getName()));
				desc.appendChild(doc.createTextNode(routine.getDescription()));

				link.appendChild(doc.createTextNode(routine.getInstallButtonLabel()));
				link.setAttribute('data-id', routine.getId());
				link.href = '#';
				link.addEventListener('click', onClick, false);

				item.appendChild(heading);
				item.appendChild(desc);
				item.appendChild(link);

				doc.getElementById('routines-list').appendChild(item);
			}
		});
	}

}

export = UiRoutinesManager;