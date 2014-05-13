import ClosableAsyncOptions = require('../../utils/interfaces/ClosableAsyncOptions');

/**
 * @interface
 * @class core.search.SearchStoreOptions
 */
interface SearchStoreOptions extends ClosableAsyncOptions {
	closeOnProcessExit?: boolean;
	logsPath?:string;
	logsFileName?:string;
}

export = SearchStoreOptions;