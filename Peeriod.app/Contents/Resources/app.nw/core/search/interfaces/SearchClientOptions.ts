import SearchStoreOptions = require('./SearchStoreOptions');

/**
 * @interface
 * @class core.search.SearchClientOptions
 */
interface SearchClientOptions extends SearchStoreOptions {
	logsPath?:string;
	logsFileName?:string;
}

export = SearchClientOptions;