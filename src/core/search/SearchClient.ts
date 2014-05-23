/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/elasticsearch/elasticsearch.d.ts' />

import fs = require('fs');
import path = require('path');

import elasticsearch = require('elasticsearch');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchClientOptions = require('./interfaces/SearchClientOptions');
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
	 * The inernally used search store created via the passed in `searchStoreFactory`
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


	constructor (config:ConfigInterface, indexName:string, searchStoreFactory:SearchStoreFactoryInterface, options:SearchClientOptions = {}) {
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
		this._indexName = indexName.toLowerCase();
		this._searchStoreFactory = searchStoreFactory;

		this._options = ObjectUtils.extend(defaults, options);
		this._options.logsPath = path.resolve(__dirname, this._options.logsPath);

		if (this._options.closeOnProcessExit) {
			process.on('exit', () => {
				this.close(this._options.onCloseCallback);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public addItem (pathToIndex:string, stats:fs.Stats, callback?:(err:Error) => any):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}

	public addMapping (type:string, mapping:Object, callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {
		};

		this._client.indices.putMapping({
			index: this._indexName,
			type : type
		}, function (err, response, status) {
			internalCallback(err);
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

	public getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public itemExists (pathToIndex:string, callback:(exists:boolean) => void):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		var onSearchStoreOpen = (err:Error) => {
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
					console.log(err);
					internalCallback(err);
				}
				else {
					this._createIndex((err:Error) => {
						if (err) {
							console.log(err);
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

		this._searchStore = this._searchStoreFactory.create(this._config, searchStoreOptions);
	}

	public typeExists (type:string, callback:(exists:boolean) => any):void {
		this._client.indices.existsType({
			index: this._indexName,
			type : type
		}, function (err, response, status) {
			//console.log(err, response, status);
			callback(response);
		});
	}

	/**
	 * Creates an index with the specified name. It will handle 'Already exists' errors gracefully.
	 *
	 * @param {string} name
	 * @param {Function} callback
	 */
	private _createIndex (callback:(err:Error) => any):void {
		this._client.indices.create({ index: this._indexName }, function (err, response, status) {
			// everything went fine or index already exists
			if (status === 200 || (status === 400 && err && err.message.indexOf('IndexAlreadyExistsException') === 0)) {
				callback(null);
			}
			else {
				callback(err);
			}
		});
	}

	/**
	 * Pings the database server in a specified interval and calls the callback after a specified timeout.
	 *
	 * @method core.search.SearchClient~_waitForDatabaseServer
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

}

export = SearchClient;