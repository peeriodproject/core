import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FolderWatcherFactoryInterface = require('./interfaces/FolderWatcherFactoryInterface');
import FolderWatcherInterface = require('./interfaces/FolderWatcherInterface');

import FolderWatcher = require('./FolderWatcher');

/**
 * @class core.fs.FolderWatcherFactory
 * @implements core.fs.FolderWatcherFactory
 */
class FolderWatcherFactory implements FolderWatcherFactoryInterface {

	public create(config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, pathToWatch:string):FolderWatcherInterface {
		return new FolderWatcher(config, appQuitHandler, pathToWatch);
	}

}

export = FolderWatcherFactory;