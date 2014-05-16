import FolderWatcherFactoryInterface = require('./interfaces/FolderWatcherFactoryInterface');
import FolderWatcherInterface = require('./interfaces/FolderWatcherInterface');

import FolderWatcher = require('./FolderWatcher');

/**
 * @class core.fs.FolderWatcherFactory
 * @implements core.fs.FolderWatcherFactory
 */
class FolderWatcherFactory implements FolderWatcherFactoryInterface {

	public create(pathToWatch:string):FolderWatcherInterface {
		return new FolderWatcher(pathToWatch);
	}

}

export = FolderWatcherFactory;