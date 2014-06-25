/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');
import SearchItemIdListInterface = require('./SearchItemIdListInterface');
import SearchItemInterface = require('./SearchItemInterface');

/**
 * The SearchClient acts as a wrapper around the search database and starts up the server automagically.
 *
 * @interface
 * @class core.search.SearchClientInterface
 */
interface SearchClientInterface extends ClosableAsyncInterface {

	/**
	 * Adds the specified object to the search index.
	 *
	 * @method core.search.SearchClientInterface#addItem
	 *
	 * @param {Object} objectToIndex
	 * @param {Function} callback
	 */
	addItem (objectToIndex:Object, callback?:(err:Error, ids:SearchItemIdListInterface) => any):void;

	/**
	 * Add the mapping for the specified type to the search index.
	 *
	 * @method core.search.SearchClientInterface#addMapping
	 *
	 * @param {string} type
	 * @param {Object} mapping
	 * @param {Function} callback
	 */
	addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void;

	/**
	 * Adds a percolate document to the specified index
	 *
	 * @method core.search.SearchClientInterface#addPercolate
	 *
	 * @param {Object} percolateParams
	 * @param {Function} callback
	 */
	addPercolate (percolateParams:Object, callback?:(err:Error, response:Object) => any):void;

	/**
	 * Deletes the index which is managed by the SearchClient instance.
	 *
	 * @method core.search.SearchClientInterface#deleteIndex
	 *
	 * @param {Function} callback
	 */
	deleteIndex (callback?:(err:Error) => any):void;

	/**
	 * Returns if an item type (plugin identifier) exitsts in the search index.
	 *
	 * @method core.search.SearchClientInterface#typeExists
	 *
	 * @param {string} type
	 * @param {Function} callback
	 */
	typeExists (type:string, callback:(exists:boolean) => any):void

	/**
	 * Returns the first item which matches the specified id accross all types (plugin identifiers)
	 *
	 * @method core.search.SearchClientInterface#getItemById
	 *
	 * @param {String} id
	 * @param {Function} callback
	 */
	getItemById (id:string, callback:(err:Error, item:SearchItemInterface) => any):void;

	/**
	 * Returns the first item which matches the specified itemPath accross all types (plugin identifiers)
	 *
	 * @method core.search.SearchClientInterface#getItemByPath
	 *
	 * @param {String} itemPath
	 * @param {Function} callback
	 */
	getItemByPath (itemPath:string, callback:(err:Error, item:SearchItemInterface) => any):void;

	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;

	itemExistsById (id:string, callback:(exists:boolean) => void):void;
}

export = SearchClientInterface;