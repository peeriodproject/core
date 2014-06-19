/// <reference path='../../../main.d.ts' />

//import gui = require('nw.gui');

import UiComponentInterface = require('../interfaces/UiComponentInterface');
import PathListInterface = require('../../fs/interfaces/PathListInterface');

/**
 * @class core.ui.UiFolderDropzoneComponent
 * @implements core.ui.UiComponentInterface
 */
class UiFolderDropzoneComponent implements UiComponentInterface {

	private _connections:Array<any> = [];

	// todo ts-declaration gui.Window
	private _window:any = null;

	private _guiWindow:any = null;

	private _windowDimensions:{ height?:number; width?:number } = {};

	private _windowPosition:{ x?:number; y?:number; } = {};

	private _paths:PathListInterface = [];

	constructor(window) {
		this._guiWindow = window;

		this._windowDimensions.height = 300;
		this._windowDimensions.width = 300;
	}

	public getChannelName ():string {
		return 'folderdropzone';
	}

	public getState():PathListInterface {
		return this._paths;
	}

	public onConnection (spark:any):void {
		this._connections.push(spark);

		spark.on('background', (background:{ background:string; color:string; inverted:string; invertedBackgroundColor:string; }) => {
			var localStorage = this._guiWindow.get().window.localStorage;

			localStorage.setItem('background', background.background);
			localStorage.setItem('color', background.color);
			localStorage.setItem('inverted', background.inverted);
			localStorage.setItem('invertedBackgroundColor', background.invertedBackgroundColor);
		});

		spark.on('open', () => {
			this._getWindow().focus();
		});

		spark.on('close', () => {
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
				this._updateUi();
			});
		}

		this._window.resizeTo(this._windowDimensions.width, this._windowDimensions.height);
		this._window.moveTo(this._windowPosition.x, this._windowPosition.y);
		this._window.show();
		this._window.setAlwaysOnTop(true);

		return this._window;
	}

	private _updateUi () {
		if (this._connections.length) {
			var state:Object = this.getState();

			for (var i = 0, l = this._connections.length; i < l; i++) {
				this._connections[i].send('update', state);
			}

			this._paths = null;
			this._paths = [];
		}
	}

}

export = UiFolderDropzoneComponent;