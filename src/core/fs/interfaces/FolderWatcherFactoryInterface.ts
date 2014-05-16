import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherFactoryInterface
 */
interface FolderWatcherFactoryInterface {

	create(pathToWatch:string):FolderWatcherInterface;

}

export = FolderWatcherFactoryInterface;