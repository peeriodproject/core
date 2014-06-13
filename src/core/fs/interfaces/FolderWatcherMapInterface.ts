import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface core.fs.FolderWatcherMapInterface
 */
interface FolderWatcherMapInterface {
	[path:string]:FolderWatcherInterface;
}

export = FolderWatcherMapInterface;