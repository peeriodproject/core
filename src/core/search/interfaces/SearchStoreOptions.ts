import ClosableAsyncOptions = require('../../utils/interfaces/ClosableAsyncOptions');

/**
 * @interface
 * @class core.search.SearchStoreOptions
 */
interface SearchStoreOptions extends ClosableAsyncOptions {
	logPath?:string;
}

export = SearchStoreOptions;