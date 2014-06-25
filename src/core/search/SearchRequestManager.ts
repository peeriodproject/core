import crypto = require('crypto');
import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchRequestManagerInterface = require('./interfaces/SearchRequestManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.search.SearchRequestManager
 * @extends core.search.SearchRequestManagerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
 * @param {string} indexName The name where outgoing queries and incoming responses will be stored.
 * @param {core.search.SearchClientInterface} searchClient
 * @param {core.utils.ClosableAsyncOptions} options
 */
class SearchRequestManager implements SearchRequestManagerInterface {

	/**
	 * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_eventEmitter
	 */
	private _eventEmitter:events.EventEmitter = null;

	/**
	 * @member {string} core.search.SearchRequestManager~_indexName
	 */
	private _indexName:string = '';

	/**
	 * @member {boolean} core.search.SearchRequestManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
	 */
	private _options:ClosableAsyncOptions = {}

	/**
	 * @member {Object} core.search.SearchRequestManager~_runningQueries
	 */
	private _runningQueries:{ [expiryTimestamp:number]:{ id:string; count:number;}; } = {};

	/**
	 *
	 * @member {} core.search.SearchRequestManager~_runningQueriesLifetime
	 */
	private _runningQueriesLifetime:Array<number> = [];

	/**
	 *
	 * @member {Object} core.search.SearchRequestManager~_runningQueriesLifetimeTimeout
	 */
	private _runningQueriesLifetimeTimeout:number = -1;

	/**
	 * @member {core.search.SearchClientInterface} core.search.SearchRequestManager~_searchClient
	 */
	private _searchClient:SearchClientInterface = null;

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, indexName:string, searchClient:SearchClientInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onOpenCallback    : function () {
			},
			onCloseCallback   : function () {
			},
			closeOnProcessExit: true
		};

		this._config = config;
		this._indexName = indexName.toLowerCase();
		this._searchClient = searchClient;
		this._options = ObjectUtils.extend(defaults, options);

		this._eventEmitter = new events.EventEmitter();

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public addQuery (queryBody:Object, callback?:(err:Error, queryId:string) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._createAndStoreQueryId((id:string) => {
			this._searchClient.createOutgoingQuery(this._indexName, id, queryBody, function (err) {
				if (err) {
					id = null;
				}

				return internalCallback(err, id);
			});
		});
	}

	public addResponse (queryId:string, responseBody:Object, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._searchClient.addIncomingResponse(this._indexName, queryId, responseBody, (err:Error, response:Object) => {
			var matches
			if (err) {
				console.error(err);
				return internalCallback(err);
			}

			if (response && response['matches'] && response['matches'].length) {
				response['matches'].forEach((match) => {
					var queryId = match['_id'];

					if (queryId) {
						this._triggerResultsChanged(queryId);
					}
				})
			}

			return internalCallback(null);
		});
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchClient.close((err:Error) => {

			this._runningQueries = null;
			this._runningQueriesLifetime = null;

			//this._eventEmitter.emit('close');
			this._eventEmitter.removeAllListeners();
			this._eventEmitter = null;

			this._stopRunningQueriesLifetime();

			this._isOpen = false;

			return internalCallback(err);
		});
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;
		var done:number = 0;
		var triggerCallback = (err) => {

			if (!this._eventEmitter) {
				this._eventEmitter = new events.EventEmitter();
			}

			this._startRunningQueriesLifetime();

			this._isOpen = true;

			return internalCallback(err);
		};

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._runningQueries = {};
		this._runningQueriesLifetime = [];

		this._searchClient.open((err) => {
			return triggerCallback(err);
		});
	}

	public onQueryResultsChanged (callback:Function):void {
		this._eventEmitter.addListener('resultsChanged', callback);
	}

	public onQueryTimeout (callback:Function):void {
		this._eventEmitter.addListener('queryTimeout', callback);
	}

	private _createAndStoreQueryId (callback:(id:string) => any):void {
		crypto.randomBytes(64, (ex, buf) => {
			var id = buf.toString('hex');
			var lifetime:number = this._config.get('search.queryLifetimeInSeconds') * 1000;
			var expiryTimestamp:number = new Date().getTime() + lifetime;

			this._runningQueries[expiryTimestamp] = {
				id   : id,
				count: 0
			};
			this._runningQueriesLifetime.push(expiryTimestamp);
			//console.log('Have %d bytes of random data: %s, %s', buf.length, buf, id);

			return callback(id);
		});
	}

	private _removeOldQueries (lifetime):void {
		var now:number = new Date().getTime();
		var newQueries:Array<number> = [];
		var newRunningQueries:{ [expiryTimestamp:number]:{ id:string; count:number;}; } = {};
		var currentQueries:Array<number> = this._runningQueriesLifetime;

		currentQueries.forEach((lifetime) => {
			if (lifetime > now) {
				newQueries.push(lifetime);
				newRunningQueries[lifetime] = this._runningQueries[lifetime];
			}
			else {
				this._triggerQueryTimeout(this._runningQueries[lifetime].id);
			}
		});

		this._runningQueriesLifetime = newQueries;
		this._runningQueries = newRunningQueries;
	}

	private _startRunningQueriesLifetime ():void {
		var lifetime:number = this._config.get('search.queryLifetimeInSeconds') * 1000;

		this._runningQueriesLifetimeTimeout = global.setTimeout(() => {
			this._removeOldQueries(lifetime);
			this._startRunningQueriesLifetime();
		}, this._config.get('search.searchRequestManager.queryLifetimeIntervalInMilliSeconds'));
	}

	private _stopRunningQueriesLifetime ():void {
		if (this._runningQueriesLifetimeTimeout) {
			global.clearTimeout(this._runningQueriesLifetimeTimeout);
			this._runningQueriesLifetimeTimeout = null;
		}
	}

	private _triggerQueryTimeout (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryTimeout', queryId);
		}
	}

	/**
	 *
	 */
	private _triggerResultsChanged (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('resultsChanged', queryId);
		}
	}


}

export = SearchRequestManager;