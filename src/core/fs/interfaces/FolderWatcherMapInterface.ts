import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherMapInterface
 */
interface FolderWatcherMapInterface {
	[path:string]:FolderWatcherInterface;
}

export = FolderWatcherMapInterface;