import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import FolderWatcherInterface = require('./FolderWatcherInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherFactoryInterface
 */
interface FolderWatcherFactoryInterface {

	create (config:ConfigInterface, pathToWatch:string):FolderWatcherInterface;

}

export = FolderWatcherFactoryInterface;