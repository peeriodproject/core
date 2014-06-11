import fs = require('fs');

import FolderWatcherListInterface = require('./FolderWatcherListInterface');
import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherManagerInterface
 * @extends core.utils.CloseableAsyncInterface
 */
interface FolderWatcherManagerInterface extends ClosableAsyncInterface {

	/**
	 * adds a folder Watcher for the specified path
	 *
	 * @param {string} pathToWatch
	 * @param {Function} callback
	 */
	addFolderWatcher (pathToWatch:string, callback?:(err:Error) => any):void;

	/**
	 * Checks all folder watcher path for existence.
	 *
	 * @param {Function} callback
	 */
	checkFolderWatcherPaths (callback?:() => any):void;

	/**
	 * Returns all folder watchers
	 *
	 * @param {Function} callback
	 */
	getFolderWatchers (callback:(folderWatchers:FolderWatcherListInterface) => any):void;

	/**
	 * Adds the callback to the event emitter for the specified event name.
	 *
	 * Possible file events are:
	 *  - add
	 *  - change
	 *  - unlink
	 *
	 *  Possible watcher events are:
	 *  - watcher.add
	 *  - watcher.invalid
	 *  - watcher.remove
	 *
	 * @method core.fs.FolderWatcherManagerInterface#on
	 *
	 * @param {string} eventName
	 * @param {Function} callback
	 */
	on (eventName:string, callback:(filePath?:string, stats?:fs.Stats) => any):void;

	/**
	 * Removes the callback from the event emitter for the specified event name
	 *
	 * @method core.fs.FolderWatcherManagerInterface#off
	 *
	 * @param {string} eventName
	 * @param {Function} callback
	 */
	off (eventName:string, callback:(filePath?:string, stats?:fs.Stats) => any):void;

	/**
	 * Removes an active folder watcher for the specified path
	 *
	 * @param {string} pathToWatch
	 * @param {Function} callback
	 */
	removeFolderWatcher (pathToWatch:string, callback?:(err:Error) => any):void;

}

export = FolderWatcherManagerInterface;