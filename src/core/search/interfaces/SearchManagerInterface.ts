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

	/**
	 * Adds an item to the store
	 *
	 * @method core.search.SearchManagerInterface#addItem
	 *
	 * @param {string} pathToIndex
	 * @param {fs.Stats} stats
	 * @param {string} fileHash
	 * @param {Function} callback
	 */
	addItem (pathToIndex:string, stats:fs.Stats, fileHash:string, callback?:(err:Error) => any):void;

	/**
	 * Returns an item from the store by the specified path
	 *
	 * @method core.search.SearchManagerInterface#getItem
	 *
	 * @param {string} pathToIndex
	 * @param {Function} callback
	 */
	getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void;

	/**
	 * Returns weather an item with the given path exists in the store
	 *
	 * @method core.search.SearchManagerInterface#itemExists
	 *
	 * @param {string} pathToIndex
	 * @param {Function} callback
	 */
	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;

}

export = SearchManagerInterface;