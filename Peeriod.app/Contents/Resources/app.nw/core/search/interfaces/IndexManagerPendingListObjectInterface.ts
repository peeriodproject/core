/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

/**
 * @interface
 * @class core.search.IndexManagerPendingListObjectInterface
 */
interface IndexManagerPendingListObjectInterface {
	isIndexing: boolean;
	stats: fs.Stats;
	callback: (err:Error) => any;
}

export = IndexManagerPendingListObjectInterface;