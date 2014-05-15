import ClosableInterface = require('../../utils/interfaces/ClosableInterface');

/**
 * @interface
 * @class core.fs.FolderWatcherInterface
 */
interface FolderWatcherInterface extends ClosableInterface {

	// todo propper return value :FolderWatcherStateInterface
	getState():any;
}

export = FolderWatcherInterface;