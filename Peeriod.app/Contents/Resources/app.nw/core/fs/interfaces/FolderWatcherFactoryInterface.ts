import AppQuitHandlerInterface = require('../../utils/interfaces/AppQuitHandlerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherFactoryInterface
 */
interface FolderWatcherFactoryInterface {

	/**
	 * @param {core.config.ConfigInterface} config
	 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
	 * @param {string} pathToWatch
	 */
	create (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, pathToWatch:string):FolderWatcherInterface;

}

export = FolderWatcherFactoryInterface;