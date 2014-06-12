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

/**
 * @class core.search.SearchClient
 * @implements core.search.SearchClientInterface
 *
 * @see https://www.npmjs.org/package/base64-stream
 *
 * @param {core.config.ConfigInterface} config
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
	 * A flag indicates weather the client is closed or open
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

	public addItem (objectToIndex:Object, callback?:(err:Error, ids:SearchItemIdListInterface) => any):void {
		var pluginIdentifiers:Array<string> = Object.keys(objectToIndex);
		var amount:number = pluginIdentifiers.length;
		var itemIds:Array<string> = [];

		var checkCallback = function (err:Error) {
			if (err) {
				console.error(err);
			}

			if (itemIds.length === amount) {
				callback(null, itemIds);
			}
		};

		if (pluginIdentifiers.length) {
			for (var i in pluginIdentifiers) {
				var identifier:string = pluginIdentifiers[i];

				this._addItemToPluginIndex(identifier.toLowerCase(), objectToIndex[identifier], function (err, id) {
					itemIds.push(id);

					checkCallback(err);
				});
			}
		}
		else {
			return process.nextTick(callback.bind(null, new Error('SearchClient.addItem: No item data specified! Preventing item creation.'), null));
		}
	}

	public addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		this._createIndex((err:Error) => {
			var map = null;
			if (Object.keys(mapping).length !== 1 || Object.keys(mapping)[0] !== type) {
				// wrap mapping in type root
				map = {};
				map[type] = mapping;
			}
			else {
				map = mapping;
			}

			if (err) {
				internalCallback(err);
			}
			else {
				this._client.indices.putMapping({
					index: this._indexName,
					type : type.toLowerCase(),
					body : map
				}, function (err, response, status) {
					err = err || null;
					internalCallback(err);
				});
			}
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

			internalCallback(err);
		});
	}

	public deleteIndex (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (this._isOpen) {
			this._client.indices.delete({
				index: this._indexName
			}, (err:Error, response, status) => {
				if (this._isValidResponse(err, status, 'IndexMissingException')) {
					internalCallback(null);
				}
				else {
					internalCallback(err);
				}
			});
		}
		else {
			return process.nextTick(internalCallback.bind(null, null));
		}
	}

	public getItem (query:Object, callback:(err:Error, item:SearchItemInterface) => any):void {
		return process.nextTick(callback.bind(null, null, null));
	}

	public getItemById (id:string, callback:(err:Error, item:SearchItemInterface) => any):void {
		this._client.get({
			index: this._indexName,
			type: '_all',
			id: id
		}, (err:Error, response:Object, status:number) => {
			err = err || null;

			if (this._isValidResponse(err, status, 'IndexMissingException')) {
				callback(null, this._createSearchItemFromResponse(response));
			}
			else {
				callback(err, null);
			}
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

		this._client.search({
			index: this._indexName,
			body: searchQuery
		}, (err:Error, response:Object, status:number) => {
			err = err || null;

			var hits:Object = response['hits'];

			if (this._isValidResponse(err, status, 'IndexMissingException')) {
				if (hits && hits['total']) {
					callback(null, this._createSearchItemFromHits(hits['hits']));
				}
				else {
					callback(null, null);
				}
			}
			else {
				callback(err, null);
			}
		});
	}

	/*public getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}*/

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public itemExists (pathToIndex:string, callback:(exists:boolean) => void):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}

	public itemExistsById (id:string, callback:(exists:boolean) => void):void {
		this._client.exists({
			index: this._indexName,
			type: '_all',
			id: id
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
				apiVersion: this._config.get('search.apiVersion', '1.1'),
				host      : this._config.get('search.host') + ':' + this._config.get('search.port'),
				log       : {
					type : 'file',
					level: 'trace',
					path : path.join(this._options.logsPath, this._options.logsFileName)
				}
			});

			this._waitForDatabaseServer((err:Error) => {
				if (err) {
					console.error(err);
					internalCallback(err);
				}
				else {
					this._createIndex((err:Error) => {
						if (err) {
							console.error(err);
						}
						else {
							this._isOpen = true;
							internalCallback(null);
						}
					});
				}
			});
		};

		var searchStoreOptions:SearchStoreOptions = ObjectUtils.extend(this._searchStoreFactory.getDefaults(), ObjectUtils.extend(this._options, {
			// we are calling the searchStore#close already in our close method.
			closeOnProcessExit: !this._options.closeOnProcessExit,
			onOpenCallback    : onSearchStoreOpen
		}));

		this._searchStore = this._searchStoreFactory.create(this._config, this._appQuitHandler, searchStoreOptions);
	}

	public typeExists (type:string, callback:(exists:boolean) => any):void {
		this._client.indices.existsType({
			index: this._indexName,
			type : type
		}, function (err, response, status) {
			callback(response);
		});
	}

	/**
	 * Creates a new `type` item and stores the given data within the {@link core.search.SearchClient~_indexName} index.
	 *
	 * @method core.search.SearchClient~_addItemToPluginIndex
	 *
	 * @param {string} type The type of the item. Usually the plugin identifier
	 * @param {Object} data The data to store
	 * @param {Function} callback
	 */
	private _addItemToPluginIndex (type:string, data:Object, callback:(err:Error, id:string) => any):void {
		this._client.index({
			index  : this._indexName,
			type   : type,
			refresh: true,
			body   : data
		}, function (err:Error, response, status) {
			if (response['created']) {
				callback(err, response['_id']);
			}
			else {
				callback(err, null);
			}
		});
	}

	/**
	 * Creates an index with the specified name. It will handle 'Already exists' errors gracefully.
	 *
	 * @method core.search.SearchClient~_createIndex
	 *
	 * @param {string} name
	 * @param {Function} callback
	 */
	private _createIndex (callback:(err:Error) => any):void {
		this._client.indices.create({
			index: this._indexName
		}, (err, response, status) => {
			// everything went fine or index already exists
			if (this._isValidResponse(err, status, 'IndexAlreadyExistsException')) {
				callback(null);
			}
			else {
				callback(err);
			}
		});
	}

	private _createSearchItemFromHits (hits):SearchItemInterface {
		if (!hits || !hits.length) {
			return null;
		}

		return this._searchItemFactory.create(hits);
	}

	private _createSearchItemFromResponse (response):SearchItemInterface {
		if (!response) {
			return null;
		}

		return this._searchItemFactory.create([response]);
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
						callback(new Error('SearchClient~waitForServer: Server is not reachable after 15 seconds'));
					}
				}
				else {
					callback(null);
				}
			});
		};

		check(0);
	}

	/**
	 * Returns `true` if given response objects matches with the http status code ( >= 200 < 300) or the error matches the specified error name.
	 * This method is used to gracefully ignore expected errors such as `not found` or `already exists`.
	 *
	 * @method core.search.SearchClient~_isValidResponse
	 *
	 * @param {Error} err
	 * @param {number} status
	 * @param {string} errorNameToIgnore
	 * @returns {boolean}
	 */
	private _isValidResponse(err:Error, status:number, errorNameToIgnore:string):boolean {
		return ((status >= 200 && status < 300) || (status >= 400 && err && err.message.indexOf(errorNameToIgnore) === 0)) ? true : false;
	}

}

export = SearchClient;