import QueryInterface = require('./QueryInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.QueryMap
 */
interface QueryMap {

	[queryIdentifier:string]:QueryInterface;
}

export = QueryMap;