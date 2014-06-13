import FolderWatcherDelayedEventInterface = require('./FolderWatcherDelayedEventInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherDelayedEventMapInterface
 */
interface FolderWatcherDelayedEventMapInterface {
	[path:string]:FolderWatcherDelayedEventInterface;
}

export = FolderWatcherDelayedEventMapInterface;