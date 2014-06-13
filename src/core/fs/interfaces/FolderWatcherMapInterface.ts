import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface core.fs.FolderWatcherListInterface
 */
interface FolderWatcherMapInterface {
	[path:string]:FolderWatcherInterface;
}

export = FolderWatcherMapInterface;