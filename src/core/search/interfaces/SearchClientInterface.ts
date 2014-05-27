/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * The SearchClient acts as a wrapper around the search database.
 * @interface
 * @class core.search.SearchClientInterface
 */
interface SearchClientInterface extends ClosableAsyncInterface {

	/**
	 *
	 * @param {Object} objectToIndex
	 * @param {Function} callback
	 */
	addItem (objectToIndex:Object, callback?:(err:Error) => any):void;

	/**
	 * Add the mapping for the specified type to the search index.
	 *
	 * @param {string} type
	 * @param {Object} mapping
	 * @param {Function} callback
	 */
	addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void;

	/**
	 * Deletes the index which is managed by the SearchClient instance
	 *
	 * @param {Function} callback
	 */
	deleteIndex (callback?:(err:Error) => any):void;

	/**
	 *
	 * @param {string} type
	 * @param {Function} callback
	 */
	typeExists (type:string, callback:(exists:boolean) => any):void

	getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void;
	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;
}

export = SearchClientInterface;