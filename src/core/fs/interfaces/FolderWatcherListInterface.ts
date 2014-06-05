import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface core.fs.FolderWatcherListInterface
 */
interface FolderWatcherListInterface {
	[path:string]:FolderWatcherInterface;
}

export = FolderWatcherListInterface;