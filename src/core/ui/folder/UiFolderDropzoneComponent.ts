/// <reference path='../../../main.d.ts' />

//import gui = require('nw.gui');

import UiComponentInterface = require('../interfaces/UiComponentInterface');
import PathListInterface = require('../../fs/interfaces/PathListInterface');

import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiFolderDropzoneComponent
 * @implements core.ui.UiComponentInterface
 */
class UiFolderDropzoneComponent extends UiComponent {

	// todo ts-declaration gui.Window
	private _window:any = null;

	private _guiWindow:any = null;

	private _windowDimensions:{ height?:number; width?:number } = {};

	private _windowPosition:{ x?:number; y?:number; } = {};

	private _paths:PathListInterface = [];

	private _currentPathKey:string = '';

	constructor(window) {
		super();

		this._guiWindow = window;

		this._windowDimensions.height = 400;
		this._windowDimensions.width = 400;

		this._setupEventListeners();
	}

	public getChannelName ():string {
		return 'folderdropzone';
	}

	public getEventNames ():Array<string> {
		return ['open', 'close'];
	}

	public getState(callback:(state:PathListInterface) => any):void {
		var state = {};

		if (this._currentPathKey) {
			state[this._currentPathKey] = this._paths;
		}
		return process.nextTick(callback.bind(null, state));
	}

	public onAfterUiUpdate ():void {
		this._paths = null;
		this._paths = [];
		this._currentPathKey = '';
	}

	private _setupEventListeners ():void {
		this.on('background', (background:{ background:string; color:string; inverted:string; invertedBackgroundColor:string; }) => {
			var localStorage = this._guiWindow.get().window.localStorage;

			localStorage.setItem('background', background.background);
			localStorage.setItem('color', background.color);
			localStorage.setItem('inverted', background.inverted);
			localStorage.setItem('invertedBackgroundColor', background.invertedBackgroundColor);
		});

		this.on('open', (key:string, backgroundSource:string, button:{ source:string; width:number; height:number; }) => {
			var w = this._getWindow();

			this._currentPathKey = key || '';

			backgroundSource = backgroundSource || '';
			//buttonSource = buttonSource || '';
			//title  = title || '__Title__';
			//description = description || '__Description__';

			w.once('loaded', () => {
				if (backgroundSource) {
					w.window.document.getElementById('background-wrapper').style.backgroundImage = this._getBackgroundUrl(backgroundSource);
				}

				if (button) {
					var buttonEl = w.window.document.getElementById('close-button');

					buttonEl.style.backgroundImage = this._getBackgroundUrl(button.source);
					buttonEl.style.height = button.height + 'px';
					buttonEl.style.width = button.width + 'px';
					buttonEl.style.marginLeft = (button.width/-2) + 'px';
				}

				w.focus();
				//w.showDevTools();
			});
		});

		this.on('close', () => {
			if (this._window) {
				this._window.close();
			}
		});
	}

	/**
	 * Adds the image metadata to the base64 data png string to prevent base64 content attacks.
	 *
	 * @param {string} source
	 * @returns {string}
	 */
	private _getBackgroundUrl (source:string):string {
		if (!source) {
			return '';
		}

		return 'url("data:image/png;base64,' + source.replace('data:image/png;base64,', '') + '")';
	}

	/**
	 * Returns the window instance.
	 *
	 * todo ts-declaration
	 */
	private _getWindow ():any {
		if (!this._window) {
			this._window = this._guiWindow.open('./public/components/folderDropzone/index.html', {
				name   : 'Dropzone',
				frame  : false,
				toolbar: false,
				show   : false,
				width  : this._windowDimensions.width,
				height : this._windowDimensions.height
			});

			this._window.on('blur', function () {
				//this.close();
			});

			this._window.on('close', () => {
				this._window.hide(); // Pretend to be closed already
				this._window.close(true);
				this._window = null;
			});

			this._window.on('move', (x, y) => {
				this._windowPosition.x = x;
				this._windowPosition.y = y;
			});

			this._window.on('resize', (width, height) => {
				this._windowDimensions.width = width;
				this._windowDimensions.height = height;
			});

			this._window.on('drop', (paths:PathListInterface) => {
				this._paths = paths;
				this.updateUi();
			});
		}

		this._window.resizeTo(this._windowDimensions.width, this._windowDimensions.height);
		this._window.moveTo(this._windowPosition.x, this._windowPosition.y);
		this._window.show();
		this._window.setAlwaysOnTop(true);

		return this._window;
	}

}

export = UiFolderDropzoneComponent;