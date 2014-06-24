import IndexManagerPendingListObjectInterface = require('./IndexManagerPendingListObjectInterface');

/**
 * @interface
 * @class core.search.IndexManagerPendingListObjectMapInterface
 */
interface IndexManagerPendingListObjectMapInterface {
	[pathToIndex:string]:IndexManagerPendingListObjectInterface;
}

export = IndexManagerPendingListObjectMapInterface;