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

	constructor(window) {
		super();

		this._guiWindow = window;

		this._windowDimensions.height = 300;
		this._windowDimensions.width = 300;

		this._setupEventListeners();
	}

	public getChannelName ():string {
		return 'folderdropzone';
	}

	public getEventNames ():Array<string> {
		return ['background', 'open', 'close'];
	}

	public getState(callback:(state:PathListInterface) => any):void {
		return process.nextTick(callback.bind(null, this._paths));
	}

	public onAfterUiUpdate ():void {
		this._paths = null;
		this._paths = [];
	}

	private _setupEventListeners ():void {
		this.on('background', (background:{ background:string; color:string; inverted:string; invertedBackgroundColor:string; }) => {
			var localStorage = this._guiWindow.get().window.localStorage;

			localStorage.setItem('background', background.background);
			localStorage.setItem('color', background.color);
			localStorage.setItem('inverted', background.inverted);
			localStorage.setItem('invertedBackgroundColor', background.invertedBackgroundColor);
		});

		this.on('open', () => {
			this._getWindow().focus();
		});

		this.on('close', () => {
			if (this._window) {
				this._window.close();
			}
		});
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