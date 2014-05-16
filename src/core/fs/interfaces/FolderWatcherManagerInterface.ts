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
	 * todo folderWatchers:FolderWatcherListInterface
	 * @param {Function} callback
	 */
	getFolderWatchers (callback:(folderWatchers:any) => any):any;

	/**
	 * Removes an active folder watcher for the specified path
	 *
	 * @param {string} pathToWatch
	 * @param {Function} callback
	 */
	removeFolderWatcher (pathToWatch:string, callback?:(err:Error) => any):void;

}

export = FolderWatcherManagerInterface;