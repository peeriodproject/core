/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import gui = require('nw.gui');

import FolderWatcherManagerInterface = require('../../fs/interfaces/FolderWatcherManagerInterface');
import UiFolderInterface = require('./interfaces/UiFolderInterface');
import UiFolderListInterface = require('./interfaces/UiFolderListInterface');
import UiFolderMapInterface = require('./interfaces/UiFolderMapInterface');

import UiComponent = require('../UiComponent');

/**
 * The UiFolderWatcherManagerComponent acts as a controller between the {@link core.fs.FolderWatcherManager} and the user interface.
 *
 * @class core.ui.UiFolderWatcherManagerComponent
 * @implements core.ui.UiComponentInterface
 *
 * @param {core.fs.FolderWatcherManagerInterface} folderWatcherManager
 */
class UiFolderWatcherManagerComponent extends UiComponent {

	/**
	 * The folder watcher manager instance
	 *
	 * @member {core.fs.FolderWatcherManagerInterface} core.ui.UiFolderWatcherManagerComponent~_folderWatcherManager
	 */
	private _folderWatcherManager:FolderWatcherManagerInterface = null;

	/**
	 * The map of currently known folders
	 *
	 * @member {core.ui.folder.UiFolderMapInterface} core.ui.UiFolderWatcherManagerComponent~_folders
	 */
	private _folders:UiFolderMapInterface = {};

	/**
	 * The node webkit gui instance
	 *
	 * todo ts-definitions
	 *
	 * @member {nw.gui} core.ui.UiFolderWatcherManagerComponent~_gui
	 */
	private _gui:any = null;

	constructor (gui:any, folderWatcherManager:FolderWatcherManagerInterface) {
		super();

		this._gui = gui;
		this._folderWatcherManager = folderWatcherManager;

		this._setupEventListeners();
		this._setupFolderWatcherEvents();
		this._setupItemEvents();
	}

	public getChannelName ():string {
		return 'folder';
	}

	public getEventNames ():Array<string> {
		return ['addFolder', 'removeFolder', 'showFolder', 'syncFolders'];
	}

	public getState(callback:(state:UiFolderListInterface) => any):void {
		var keys:Array<string> = Object.keys(this._folders);
		var folders:UiFolderListInterface = [];

		for (var i = 0, l = keys.length; i < l; i++) {
			var folder = this._folders[keys[i]];

			if (folder) {
				folders.push(folder);
			}
		}

		return process.nextTick(callback.bind(null, folders));
	}

	/**
	 * Adds a folder to the folders list
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_createFolder
	 *
	 * @param {string} path
	 * @param {string} status the folder status (optional)
	 */
	private _createFolder (path:string, status:string = 'active'):void {
		if (!this._folderExists(path)) {
			this._folders[path] = {
				items: 0,
				name: this._getFolderName(path),
				path: path,
				status: status
			};
		}
	}

	/**
	 * Increments the item count for the corresponding folder
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_addItem
	 *
	 * @param {string} path
	 */
	private _addItem (path:string) {
		var folderPath = this._getFolderPathForItem(path);

		this._folders[folderPath].items++;
	}

	/**
	 * Returns `true` if the folder exists in the folder list.
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_folderExists
	 *
	 * @param {string} path
	 */
	private _folderExists (path:string):boolean {
		return this._folders[path] ? true : false;
	}

	/**
	 * Extracts and returns the folder name from the given path
	 *
	 * todo add windows path seperator switch
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_getFolderName
	 *
	 * @param {string} path
	 * @returns {string}
	 */
	private _getFolderName(path:string):string {
		return path.split('/').pop();
	}

	/**
	 * Returns the folder path of the folder which contains the specified item
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_getFolderPathForItem
	 *
	 * @param {string} itemPath
	 * @returns {string}
	 */
	private _getFolderPathForItem(itemPath:string):string {
		var folderPaths:Array<string> = Object.keys(this._folders);
		var folderPath:string = '';

		folderPaths.sort();
		folderPaths.reverse();

		for (var i = 0, l = folderPaths.length; i < l; i++) {
			var path:string = folderPaths[i];

			if (itemPath.indexOf(path) === 0) {
				folderPath = path;
				break;
			}
		}

		return folderPath;
	}

	/**
	 * Removes the specified path from the folder list
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_removeFolder
	 *
	 * @param {string} path
	 */
	private _removeFolder(path:string):void {
		this._folders[path] = null;

		delete this._folders[path];
	}

	/**
	 * Decrements the item count for th corresponding folder
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_removeItem
	 *
	 * @param {stirng} path
	 */
	private _removeItem (path:string) {
		var folderPath = this._getFolderPathForItem(path);

		this._folders[folderPath].items--;
	}

	private _setupEventListeners ():void {
		this.on('addFolder', (path) => {
			this._folderWatcherManager.addFolderWatcher(path);
		});

		this.on('removeFolder', (path) => {
			this._folderWatcherManager.removeFolderWatcher(path);
		});

		// todo limit path to watched folders
		this.on('showFolder', (path) => {
			this._gui.Shell.showItemInFolder(path);
		});

		this.on('syncFolders', () => {
			this._folderWatcherManager.checkFolderWatcherPaths();
		});
	}

	/**
	 * Registers listeners for folder changes on the {@link core.ui.UiFolderWatcherManagerComponent~_folderWatcherManager}
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_setupFolderWatcherEvents
	 */
	private _setupFolderWatcherEvents ():void {
		this._folderWatcherManager.on('watcher.add', (path) => {
			this._setStatus(path, 'active');
			this.updateUi();
		});

		this._folderWatcherManager.on('watcher.invalid', (path) => {
			this._setStatus(path, 'invalid');
			this.updateUi();
		});

		this._folderWatcherManager.on('watcher.remove', (path) => {
			this._removeFolder(path);
			this.updateUi();
		});

		this._folderWatcherManager.on('watcher.removeInvalid', (path) => {
			this._removeFolder(path);
			this.updateUi();
		});
	}

	/**
	 * Registers listeners for item changes on the {@link core.ui.UiFolderWatcherManagerComponent~_folderWatcherManager}
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_setupItemEvents
	 */
	private _setupItemEvents ():void {
		this._folderWatcherManager.on('add', (path) => {
			this._addItem(path);
			this.updateUi();
		});

		this._folderWatcherManager.on('unlink', (path) => {
			this._removeItem(path);
			this.updateUi();
		});
	}

	/**
	 * Sets the status of the folder
	 *
	 * @member core.ui.UiFolderWatcherManagerComponent~_setStatus
	 *
	 * @param {string} path
	 * @param {string} status
	 */
	private _setStatus(path:string, status:string):void {
		if (!this._folderExists(path)) {
			this._createFolder(path, status);
		}
		else {
			this._folders[path].status = status;
		}
	}

}

export = UiFolderWatcherManagerComponent;