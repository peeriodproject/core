/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.search.SearchApiInterface
 */
interface SearchApiInterface extends ClosableAsyncInterface {

	addItem (pathToIndex:string, stats:fs.Stats, callback?:(err:Error) => any):void;
	getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void;
	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;

}
export = SearchApiInterface;