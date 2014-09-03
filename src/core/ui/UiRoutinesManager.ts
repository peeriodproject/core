/// <reference path='../../main.d.ts' />

var i18n = require('i18n');

import UiRoutineInterface = require('./interfaces/UiRoutineInterface');
import UiRoutineListInterface = require('./interfaces/UiRoutineListInterface');
import UiRoutinesManagerInterface = require('./interfaces/UiRoutinesManagerInterface');

var logger = require('../utils/logger/LoggerFactory').create();

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
			min_width: 1050,
			width: 1050,
			min_height: 600,
			height: 600,
			frame: true,
			toolbar: false,
			resizable: true,
			show: false,
			show_in_taskbar: false
		});

		this._window.once('loaded', () => {
			/*try {
				this._window.showDevTools();
			} catch (e) {
				console.error(e);
			}*/
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
				logger.error('Error installing UI routine', {errmsg: err.message});
			}
		});
	}

	private _updateWindow ():void {
		this.getInstalledRoutineIds((err, ids) => {
			var routines = this.getUiRoutines();
			var doc = this._window.window.document;
			var routinesList = doc.getElementById('routines-list');
			var items = [];
			var getClosest = function (el, tag) {
				// this is necessary since nodeName is always in upper case
				tag = tag.toUpperCase();
				do {
					if (el.nodeName === tag) {
						// tag name is found! let's return it. :)
						return el;
					}
				} while (el = el.parentNode);

				// not found :(
				return null;
			};
			var onItemClick = (event) => {
				var target = event.target.tagName === 'LI' ? event.target : getClosest(event.target, 'LI');
				var newClassName = target.className.indexOf('active') === -1 ? target.className + ' active' : target.className.replace('active', '');

				event.preventDefault();

				for (var i = 0, l = items.length; i < l; i++) {
					items[i].className = '';
				}

				target.className = newClassName;
			};
			var onLinkClick = (event) => {
				event.target.removeEventListener(onLinkClick);

				this._clickInstallRoutineButton(event);
			};

			routinesList.innerHTML = '';

			doc.title = i18n.__('uiRoutinesManager.installRoutinesWindowTitle');

			doc.getElementById('headline').innerHTML = i18n.__('uiRoutinesManager.installRoutinesHeadline');
			doc.getElementById('description').innerHTML = i18n.__('uiRoutinesManager.installRoutinesDescription');
			doc.getElementById('install-btn-placeholder').innerHTML = i18n.__('uiRoutinesManager.installRoutinesButtonPlaceholder');

			for (var i = 0, l = routines.length; i < l; i++) {
				var routine = routines[i];

				if (ids.indexOf(routine.getId()) !== -1) {
					routine = null;

					continue;
				}

				var item = doc.createElement('li');
				var icon = routine.getIcon();

				item.className = icon ? 'has-icon' : '';
				item.addEventListener('click', onItemClick, false);

				var iconEl;

				var contentEl = doc.createElement('div');
				var heading = doc.createElement('h2');
				var desc = doc.createElement('p');
				var linkWrapper = doc.createElement('div');
				var link = doc.createElement('a');

				if (icon) {
					iconEl = doc.createElement('div');
					iconEl.className = 'icon';
					iconEl.style.backgroundImage = 'url(data:image/svg+xml;base64,' + icon + ')';
				}

				contentEl.className = 'content';

				heading.appendChild(doc.createTextNode(routine.getName()));
				desc.appendChild(doc.createTextNode(routine.getDescription()));

				linkWrapper.className = 'install-btn-wrapper';

				link.appendChild(doc.createTextNode(routine.getInstallButtonLabel()));
				link.setAttribute('data-id', routine.getId());
				link.href = '#';
				link.className = 'install-btn'
				link.addEventListener('click', onLinkClick, false);

				if (iconEl) {
					item.appendChild(iconEl);
				}

				contentEl.appendChild(heading);
				contentEl.appendChild(desc);
				item.appendChild(contentEl);

				linkWrapper.appendChild(link);
				item.appendChild(linkWrapper);

				routinesList.appendChild(item);

				items.push(item);
			}
		});
	}

}

export = UiRoutinesManager;