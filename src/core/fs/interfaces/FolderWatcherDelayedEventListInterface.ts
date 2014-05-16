import FolderWatcherDelayedEventInterface = require('./FolderWatcherDelayedEventInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherDelayedEventListInterface
 */
interface FolderWatcherDelayedEventListInterface {
	[path:string]:FolderWatcherDelayedEventInterface;
}

export = FolderWatcherDelayedEventListInterface;