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
	 * Adds a incoming response to the specified index
	 *
	 * @method core.search.SearchClientInterface#addIncomingResponse
	 *
	 * @param {string} indexName The index to perculate the object into.
	 * @param {string} type The type of the response object
	 * @param {Object} responseBody The response body to store
	 * @param {Object} responseMeta The response meta data to store
	 * @param {Function} callback
	 */
	addIncomingResponse (indexName:string, type:string, responseBody:Object, responseMeta:Object, callback?:(err:Error) => any):void;

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
	 * Checks if the response matches any running queries
	 *
	 * @method core.search.SearchClientInterface#checkIncomingResponse
	 *
	 * @param {string} indexName
	 * @param {string} type
	 * @param {Object} responseBody
	 * @param {Object} responseMeta
	 * @param {Function} callback
	 */
	checkIncomingResponse (indexName:string, type:string, responseBody:Object, callback?:(err:Error, matches:Array<Object>) => any):void;

	/**
	 * Stores the query and prepares an index where incoming results will be stored.
	 *
	 * @method core.search.SearchClientInterface#createOutgoingQuery
	 *
	 * @param {string} indexName
	 * @param {string} queryId
	 * @param {Object} queryBody
	 * @param {Function} callback
	 */
	createOutgoingQuery (indexName:string, queryId:string, queryBody:Object, callback?:(err:Error) => any):void;

	/**
	 * Prepares the index which will be used as the datastore for outgoing queries and corresponding results.
	 *
	 * @method core.search.SearchClientInterface#createOutgoingQueryIndex
	 *
	 * @param {string} indexName The name of the index
	 * @param {Object} mapping The mapping of the index. The mapping should set additional metadata to `index:no`
	 * @param {Function} callback
	 */
	createOutgoingQueryIndex (indexName:string, callback?:(err:Error) => any):void

	/**
	 * Deletes the index which is managed by the SearchClient instance.
	 *
	 * @method core.search.SearchClientInterface#deleteIndex
	 *
	 * @param {Function} callback
	 */
	deleteIndex (callback?:(err:Error) => any):void;

	/**
	 * Removes a query and all corresponding responses from the database.
	 *
	 * @param {string} indexName
	 * @param {string} queryId
	 * @param callback
	 */
	deleteOutgoingQuery (indexName:string, queryId:string, callback?:(err:Error) => any):void

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

	/**
	 * Returns the corresponding queryBody to the given `queryId` from the database
	 *
	 * @method core.search.SearchClientInterface#getOutgoingQuery
	 *
	 * @param {string} queryId
	 * @param {Function} callback
	 */
	getOutgoingQuery (indexName:string, queryId:string, callback:(err:Error, queryBody:Object) => any):void;

	/**
	 * Returns the responses of the specified type that matches the given query.
	 *
	 * @method core.search.SearchClientInterface#getIncomingResponses
	 *
	 * @param {string} indexName
	 * @param {string} type
	 * @param {Object} queryBody
	 * @param {Function} callback The callback that gets called with a possible error and the responses as arguments
	 */
	getIncomingResponses (indexName:string, type:string, queryBody:Object, callback:(err:Error, responses:any) => any):void;

	itemExists (pathToIndex:string, callback:(exists:boolean) => void):void;

	itemExistsById (id:string, callback:(exists:boolean) => void):void;

	/**
	 * @method core.search.SearchClientInterface#search
	 *
	 * @param {Object} queryObject
	 * @param {Function} callback
	 */
	search (queryObject:Object, callback:(err:Error, results:any) => any):void;

	/**
	 * Returns if an item type (plugin identifier) exitsts in the search index.
	 *
	 * @method core.search.SearchClientInterface#typeExists
	 *
	 * @param {string} type
	 * @param {Function} callback
	 */
	typeExists (type:string, callback:(exists:boolean) => any):void
}

export = SearchClientInterface;