/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/elasticsearch/elasticsearch.d.ts' />

import fs = require('fs');
import path = require('path');

import elasticsearch = require('elasticsearch');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchClientOptions = require('./interfaces/SearchClientOptions');
import SearchItemFactoryInterface = require('./interfaces/SearchItemFactoryInterface');
import SearchItemIdListInterface = require('./interfaces/SearchItemIdListInterface');
import SearchItemInterface = require('./interfaces/SearchItemInterface');
import SearchStoreFactoryInterface = require('./interfaces/SearchStoreFactoryInterface');
import SearchStoreInterface = require('./interfaces/SearchStoreInterface');
import SearchStoreOptions = require('./interfaces/SearchStoreOptions');

import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * @class core.search.SearchClient
 * @implements core.search.SearchClientInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
 * @param {core.search.SearchStoreFactory} searchStoreFactory
 * @param {core.search.SearchClientOptions} options
 */
class SearchClient implements SearchClientInterface {

	/**
	 * The internally used appQuitHandler instance
	 *
	 * @member {core.utils.AppQuitHandler} core.search.SearchClient~_appQuitHandler
	 */
	private _appQuitHandler:AppQuitHandlerInterface = null;

	/**
	 * The client which is used internally to make requests against the database api
	 *
	 * @member {elasticsearch.Client} core.search.SearchClient~_client
	 */
	private _client:elasticsearch.ClientInterface = null;

	/**
	 * The internally used config object
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchClient~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The index name this client is managing.
	 *
	 * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices.html
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchClient~_indexName
	 */
	private _indexName:string = null;
	/**
	 * A flag indicates whether the client is closed or open
	 *
	 * @member {boolean} core.search.SearchClient~_isOpen
	 */
	private _isOpen = false;

	/**
	 * The mix of the passed in options object and the defaults
	 *
	 * @member {core.utils.SearchClientOptions} core.search.SearchClient~_options
	 */
	private _options:SearchClientOptions = null;

	/**
	 * The internally used search item factory
	 *
	 * @member {core.search.SearchItemFactoryInterface} core.search.SearchClient~_searchItemFactory
	 */
	private _searchItemFactory:SearchItemFactoryInterface = null;
	/**
	 * The internally used search store created via the passed in `searchStoreFactory`
	 *
	 * @member {core.utils.SearchStoreInterface} core.search.SearchClient~_searchStore
	 */
	private _searchStore:SearchStoreInterface = null;

	/**
	 * The inernally used search store factory.
	 *
	 * @member {core.utils.SearchStoreFactory} core.search.SearchClient~_searchStoreFactory
	 */
	private _searchStoreFactory:SearchStoreFactoryInterface = null;

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, indexName:string, searchStoreFactory:SearchStoreFactoryInterface, searchItemFactory:SearchItemFactoryInterface, options:SearchClientOptions = {}) {
		var defaults:SearchClientOptions = {
			logsPath          : '../../logs',
			logsFileName      : 'searchStore.log',
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._appQuitHandler = appQuitHandler;
		this._indexName = indexName.toLowerCase();
		this._searchStoreFactory = searchStoreFactory;
		this._searchItemFactory = searchItemFactory;

		this._options = ObjectUtils.extend(defaults, options);
		this._options.logsPath = path.resolve(__dirname, this._options.logsPath);

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public addIncomingResponse (indexName:string, type:string, responseBody:Object, responseMeta:Object, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		var body = ObjectUtils.extend(responseBody, {
			_meta: responseMeta
		});

		this._client.index({
			index  : indexName.toLowerCase(),
			type   : this._getResponseType(type),
			body   : body,
			refresh: true
		}, function (err:Error, response:Object, status:number) {
			err = err || null;

			return internalCallback(err);
		});
	}

	public checkIncomingResponse (indexName:string, type:string, responseBody:Object, callback?:(err:Error, matches:Array<Object>) => any):void {
		var internalCallback = callback || function (err:Error, response:Object) {
		};

		this._client.percolate({
			index: indexName.toLowerCase(),
			type : this._getResponseType(type),
			body : {
				doc: responseBody
			}
		}, function (err:Error, response:Object, status:number) {
			var matches = response && response['total'] ? response['matches'] : [];

			err = err || null;

			return internalCallback(err, matches);
		});
	}

	public addItem (objectToIndex:Object, callback?:(err:Error, ids:SearchItemIdListInterface) => any):void {
		var pluginIdentifiers:Array<string> = Object.keys(objectToIndex);
		var amount:number = pluginIdentifiers.length;
		var itemIds:Array<string> = [];

		var checkCallback = function (err:Error) {
			if (err) {
				console.error(err);
			}

			if (itemIds.length === amount) {
				return callback(null, itemIds);
			}
		};

		if (!pluginIdentifiers.length) {
			return process.nextTick(callback.bind(null, new Error('SearchClient.addItem: No item data specified! Preventing item creation.'), null));
		}

		// todo get data from plugin indexes. check each plugin individual and update or add data
		this.itemExists(objectToIndex[pluginIdentifiers[0]].itemPath, (exists:boolean, item:SearchItemInterface) => {
			var existingIdentifiers:Array<string> = item ? item.getPluginIdentifiers() : [];
			var existingIdentifiersLength:number = existingIdentifiers.length;

			for (var i = 0, l = pluginIdentifiers.length; i < l; i++) {
				var identifier:string = pluginIdentifiers[i];
				var lowercasedIdentifier:string = identifier.toLowerCase();

				// checks if the existing item contains the current identifier and adds the current id to the object to force
				// the database to update the old item instead of creating a new one.
				if (existingIdentifiersLength && existingIdentifiers.indexOf(lowercasedIdentifier) !== -1) {
					objectToIndex[identifier]['_id'] = item.getPluginData(lowercasedIdentifier)['_id'];
				}

				this._addItemToPluginIndex(identifier.toLowerCase(), objectToIndex[identifier], function (err, id) {
					itemIds.push(id);

					return checkCallback(err);
				});
			}
		});
	}

	public addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		this._createIndex(this._indexName, null, (err:Error) => {
			var map = null;
			if (Object.keys(mapping).length !== 1 || Object.keys(mapping)[0] !== type) {
				// wrap mapping in type root
				map = {};
				map[type.toLowerCase()] = mapping;
			}
			else {
				map = mapping;
			}

			if (!(!err && this._client)) {
				return internalCallback(err);
			}

			this._client.indices.putMapping({
				index: this._indexName,
				type : type.toLowerCase(),
				body : map
			}, function (err, response, status) {
				err = err || null;
				internalCallback(err);
			});
		});
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchStore.close((err:Error) => {
			this._isOpen = false;
			this._client = null;

			return internalCallback(err);
		});
	}

	public createOutgoingQuery (indexName:string, id:string, queryBody:Object, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._client.index({
			index: indexName.toLowerCase(),
			type : '.percolator',
			id   : id,
			body : queryBody // todo add meta data ObjectUtils.extend(queryBody, queryMetas)
		}, function (err:Error, response:Object, status:number) {
			err = err || null;

			return internalCallback(err);
		});
	}

	public createOutgoingQueryIndex (indexName:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		var mapping = {
			_default_: {
				meta      : {
					type : 'object',
					index: 'no'
				},
				_timestamp: {
					enabled: true,
					store  : true
				}
			}
		};

		indexName = indexName.toLowerCase();

		this._createIndex(indexName, mapping, (err:Error) => {
			if (err) {
				console.error(err);
				return internalCallback(err);
			}

			return internalCallback(err);
		});
	}

	public deleteIndex (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (!(this._isOpen && this._client)) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._client.indices.delete({
			index: this._indexName
		}, (err:Error, response, status) => {
			if (!this._isValidResponse(err, status, 'IndexMissingException')) {
				return internalCallback(err);
			}

			return internalCallback(null);
		});
	}

	public deleteOutgoingQuery (indexName:string, queryId:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var queryDeleted:boolean = false;
		var responsesDeleted:boolean = false;

		var checkCallback:Function = function (err:Error) {
			if (err) {
				queryDeleted = false;
				responsesDeleted = false;

				console.error(err);

				return internalCallback(err);
			}
			else if (queryDeleted && responsesDeleted) {
				return internalCallback(null);
			}
		};

		if (!(this._isOpen && this._client)) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		indexName = indexName.toLowerCase();

		// delete query
		this._client.delete({
			index: indexName,
			type : '.percolator',
			id   : queryId
		}, (err:Error, response, status) => {
			if (this._isValidResponse(err, status, 'IndexMissingException') || this._isValidResponse(err, status, 'Not Found')) {
				err = null;
			}

			queryDeleted = true;

			return checkCallback(err);
		});

		// delete all responses for the queryId
		this._client.deleteByQuery({
			index: indexName,
			type : this._getResponseType(queryId),
			body : {
				query: {
					bool: {
						must: [
							{
								match_all: {}
							}
						]
					}
				}
			}
		}, (err:Error, response, status) => {
			if (this._isValidResponse(err, status, 'IndexMissingException')) {
				err = null;
			}

			responsesDeleted = true;

			return checkCallback(err);
		});

	}

	public getIncomingResponseByHash (indexName:string, type:string, hash:string, callback:(err:Error, response:Object) => any):void {
		// todo limit query to 1
		var searchQuery:Object = {
			query: {
				match: {
					itemHash: hash
				}
			}
		};

		this._client.search({
			index: indexName.toLowerCase(),
			type : (!type || type === '_all') ? '' : this._getResponseType(type),
			body : searchQuery
		}, (err:Error, response:Object, status:number) => {
			return this._checkHitsAndCallCallback(err, response, status, function (err:Error, data:any) {
				if (err || !data) {
					return callback(err, data);
				}

				return callback(null, data.hits[0]);
			});
		});
	}

	public getIncomingResponseById (indexName:string, type:string, id:string, callback:(err:Error, response:Object) => any):void {
		this._client.getSource({
			index: indexName,
			type : (!type || type === '_all') ? '_all' : this._getResponseType(type),
			id   : id
		}, (err:Error, response:Object, status:number) => {
			err = err || null;

			if (!this._isValidResponse(err, status, 'IndexMissingException')) {
				return callback(err, null);
			}

			return callback(null, response);
		});
	}

	public getIncomingResponses (indexName:string, type:string, queryBody:Object, callback:(err:Error, responses:any) => void):void {
		this._client.search({
			index : indexName.toLowerCase(),
			type  : this._getResponseType(type),
			body  : queryBody,
			fields: [
				'_source',
				'_timestamp'
			]
		}, (err, response:Object, status:number) => {
			return this._checkHitsAndCallCallback(err, response, status, callback);
		});
	}

	public getItemByHash (itemHash:string, callback:(err:Error, item:SearchItemInterface) => any):void {
		var searchQuery:Object = {
			query: {
				match: {
					itemHash: itemHash
				}
			}
		};

		return this._getItemByQuery(searchQuery, callback);
	}

	public getItemById (id:string, callback:(err:Error, item:SearchItemInterface) => any):void {
		this._client.get({
			index: this._indexName,
			type : '_all',
			id   : id
		}, (err:Error, response:Object, status:number) => {
			err = err || null;

			if (!this._isValidResponse(err, status, 'IndexMissingException')) {
				return callback(err, null);
			}

			return callback(null, this._createSearchItemFromResponse(response));
		});
	}

	public getItemByPath (itemPath:string, callback:(err:Error, item:SearchItemInterface) => any):void {
		var searchQuery:Object = {
			query: {
				match: {
					itemPath: itemPath
				}
			}
		};

		return this._getItemByQuery(searchQuery, callback);
	}

	public getOutgoingQuery (indexName:string, queryId:string, callback:(err:Error, queryBody:Object) => void):void {
		this._client.getSource({
			index: indexName.toLowerCase(),
			type : '.percolator',
			id   : queryId
		}, (err:Error, response:Object, status:number) => {
			if (!this._isValidResponse(err, status, 'Not Found')) {
				return callback(err, null);
			}

			response = response || null;

			return callback(null, response);
		});
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public itemExists (pathToIndex:string, callback:(exists:boolean, item:SearchItemInterface) => void):void {
		var query = {
			query  : {
				match: {
					itemPath: pathToIndex
				}
			},
			_source: {
				include: ['itemPath', 'itemHash', 'itemName', 'itemStats']
			}
		};

		this._getItemByQuery(query, function (err:Error, item:SearchItemInterface) {
			var exists:boolean;

			item = err ? null : item;

			exists = item !== null ? true : false;

			return callback(exists, item);
		});

		//return process.nextTick(callback.bind(null, null, null));
	}

	public itemExistsById (id:string, callback:(exists:boolean) => void):void {
		this._client.exists({
			index: this._indexName,
			type : '_all',
			id   : id
		}, function (err, exists) {
			return callback(exists === true);
		});
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		var onSearchStoreOpen:Function = (err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			this._client = elasticsearch.Client({
				apiVersion    : this._config.get('search.apiVersion', '1.1'),
				host          : this._config.get('search.host') + ':' + this._config.get('search.port'),
				requestTimeout: this._config.get('search.requestTimeoutInSeconds') * 1000,
				log           : {
					type : 'file',
					level: ['error', 'warning'],//'trace',
					path : path.join(this._options.logsPath, this._options.logsFileName)
				}
			});

			console.log('added elasticsearch client');

			this._waitForDatabaseServer((err:Error) => {
				if (err) {
					logger.error(err);
					return internalCallback(err);
				}

				this._createIndex(this._indexName, null, (err:Error) => {
					err = err || null;

					if (!err) {
						this._isOpen = true;
					}

					return internalCallback(null);
				});
			});
		};

		var searchStoreOptions:SearchStoreOptions = ObjectUtils.extend(this._searchStoreFactory.getDefaults(), ObjectUtils.extend(this._options, {
			// we are calling the searchStore#close already in our close method.
			closeOnProcessExit: !this._options.closeOnProcessExit,
			onOpenCallback    : onSearchStoreOpen
		}));

		this._searchStore = this._searchStoreFactory.create(this._config, this._appQuitHandler, searchStoreOptions);
	}

	public search (queryObject:Object, callback:(err:Error, results:any) => any):void {
		this._client.search({
			index: this._indexName,
			body : queryObject
		}, function (err, response, status) {
			var hits:Object = response && response['hits'] ? response['hits'] : null;

			err = err || null;

			if (err) {
				logger.error(err);
			}

			return callback(err, hits);
		});
	}

	public typeExists (type:string, callback:(exists:boolean) => any):void {
		if (this._client) {
			this._client.indices.existsType({
				index: this._indexName,
				type : type.toLowerCase()
			}, function (err, response, status) {
				return callback(response);
			});
		}
		else {
			return callback(false);
		}
	}

	/**
	 * Creates a new `type` item and stores the given data within the {@link core.search.SearchClient~_indexName} index.
	 * Should the the data object contains a `_id` key an existing item will be updated.
	 *
	 * @method core.search.SearchClient~_addItemToPluginIndex
	 *
	 * @param {string} type The type of the item. Usually the plugin identifier
	 * @param {Object} data The data to store
	 * @param {Function} callback
	 */
	private _addItemToPluginIndex (type:string, data:Object, callback:(err:Error, id:string) => any):void {
		var id = data['_id'] || null;

		delete data['_id'];

		this._client.index({
			index  : this._indexName,
			type   : type,
			id     : id,
			refresh: true,
			body   : data
		}, function (err:Error, response, status) {
			if (response && response['created']) {
				return callback(err, response['_id']);
			}
			else {
				return callback(err, null);
			}
		});
	}

	/**
	 * Checks if the specified response contains any hits or errors and calls the callback accordingly.
	 *
	 * @method core.search.SearchClient~_checkHitsAnCallCallback
	 *
	 * @param {Error} err
	 * @param {Object} response
	 * @param {status} status
	 * @param {Function} callback
	 */
	private _checkHitsAndCallCallback (err:Error, response:Object, status:number, callback:(err:Error, response:any) => any):void {
		var hits:Object = response && response['hits'] ? response['hits'] : {};

		err = err || null;

		if (!(hits && hits['total'])) {
			return callback(err, null);
		}

		return callback(null, hits);
	}

	/**
	 * Creates an index with the specified name. It will handle 'Already exists' errors gracefully.
	 *
	 * @method core.search.SearchClient~_createIndex
	 *
	 * @param {string} indexName
	 * @param {Object|Null} mapping The optional mapping to stick to the index.
	 * @param {Function} callback
	 */
	private _createIndex (indexName:string, mapping:Object, callback:(err:Error) => any):void {
		var params:Object = {
			index: indexName
		};

		if (mapping) {
			params = ObjectUtils.extend(params, {
				body: {
					mappings: mapping
				}
			});
		}

		this._client.indices.create(params, (err, response, status) => {
			// everything went fine or index already exists
			if (this._isValidResponse(err, status, 'IndexAlreadyExistsException')) {
				return callback(null);
			}
			else {
				return callback(err);
			}
		});
	}

	private _createSearchItemFromHits (hits):SearchItemInterface {
		if (!hits || !hits.length) {
			return null;
		}

		return this._searchItemFactory.create(hits);
	}

	/**
	 * Transforms an incoming response into a {@link core.search.SearchItemInterface} by using the {@link core.search.SearchClient~_searchItemFactory}
	 *
	 * @method core.search.SearchClient~_createSearchItemFromResponse
	 *
	 * @param {Object} response
	 * @returns core.search.SearchItemInterface
	 */
	private _createSearchItemFromResponse (response:Object):SearchItemInterface {
		if (!response) {
			return null;
		}

		return this._searchItemFactory.create([response]);
	}

	/**
	 * Internal helper method that transforms the results of the given search query into a {@link core.search.SearchItemInterface}
	 *
	 * @method core.search.SearchClient~_getItemByQuery
	 *
	 * @param {Object} searchQuery
	 * @param {Function} callback
	 */
	private _getItemByQuery (searchQuery:Object, callback:(err:Error, item:SearchItemInterface) => any):void {
		this._client.search({
			index: this._indexName,
			body : searchQuery
		}, (err:Error, response:Object, status:number) => {
			var hits:Object = response && response['hits'] ? response['hits'] : {};

			err = err || null;

			if (!this._isValidResponse(err, status, 'IndexMissingException')) {
				return callback(err, null);
			}

			if (!(hits && hits['total'])) {
				return callback(null, null);
			}

			return callback(null, this._createSearchItemFromHits(hits['hits']));
		});
	}

	/**
	 * Returns the prefixed lowercase type
	 *
	 * @method core.search.SearchClient~_getResponseType
	 *
	 * @param {string} type
	 * @returns {string}
	 */
	private _getResponseType (type:string):string {
		return type[0] === '_' ? type : 'response' + type.toLowerCase();
	}

	/**
	 * Pings the database server in a specified interval and calls the callback after a specified timeout.
	 *
	 * @method core.search.SearchClient~_waitForDatabaseServer
	 *
	 * @param {Function} callback
	 */
	private _waitForDatabaseServer (callback):void {
		var check = (i:number) => {
			this._client.ping({
				requestTimeout: 1000,
				hello         : 'elasticsearch'
			}, (err:Error) => {
				if (err) {
					if (i < 30) {
						setTimeout(() => {
							check(++i);
						}, 500);
					}
					else {
						return callback(new Error('SearchClient~waitForServer: Server is not reachable after 15 seconds'));
					}
				}
				else {
					return callback(null);
				}
			});
		};

		check(0);
	}

	/**
	 * Returns `true` if the given response objects matches with the http status code ( >= 200 < 300) or the error matches the specified error name.
	 * This method is used to gracefully ignore expected errors such as `not found` or `already exists`.
	 *
	 * @method core.search.SearchClient~_isValidResponse
	 *
	 * @param {Error} err
	 * @param {number} status
	 * @param {string} errorNameToIgnore
	 * @returns {boolean}
	 */
	private _isValidResponse (err:Error, status:number, errorNameToIgnore:string):boolean {
		return ((status >= 200 && status < 300) || (status >= 400 && err && err.message.indexOf(errorNameToIgnore) === 0)) ? true : false;
	}

}

export = SearchClient;