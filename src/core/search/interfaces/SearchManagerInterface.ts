/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');
/**
 * The SearchManager acts as a bridge between the SearchClient and the Indexer.
 * It passes a new file to the PluginManager for further analysis to get additional meta data before adding it to the index.
 *
 * @interface
 * @class core.search.SearchManagerInterface
 */
interface SearchManagerInterface extends ClosableAsyncInterface {

	addItem (pathToIndex:string, stats:fs.Stats, fileHash:string, callback?:(err:Error) => any):void;
	getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void;
	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;

}

export = SearchManagerInterface;