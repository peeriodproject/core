import crypto = require('crypto');
import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import BufferListInterface = require('../utils/interfaces/BufferListInterface');
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
	 * The internally used config instance
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * The event emitter instance to trigger events.
	 *
	 * @see core.search.SearchRequestManager#onQueryAdd
	 * @see core.search.SearchRequestManager#onQueryEnd
	 * @see core.search.SearchRequestManager#onQueryRemoved
	 * @see core.search.SearchRequestManager#onQueryResultsChanged
	 * @see core.search.SearchRequestManager#onQueryTimeout
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_eventEmitter
	 */
	private _eventEmitter:events.EventEmitter = null;

	/**
	 * The name of the internally used index to store queries and responses in the database
	 *
	 * @member {string} core.search.SearchRequestManager~_indexName
	 */
	private _indexName:string = '';

	/**
	 * A flag indicates weather the SearchRequestManager is open or not.
	 *
	 * @member {boolean} core.search.SearchRequestManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
	 */
	private _options:ClosableAsyncOptions = {}

	/**
	 * A map of currently running search queries. The identifier is the expiry date of the stored query Object { id:string, count:number }
	 *
	 * @member {Object} core.search.SearchRequestManager~_runningQueries
	 */
	private _runningQueryIds:{ [expiryTimestamp:number]:{ id:string; count:number;}; } = {};

	/**
	 * Reverse queryId lookup shortcut. The queryId is used as identifier, the expiry date is the value
	 *
	 * @member {Object} core.search.SearchRequestManager~_runningQueryIdMap
	 */
	private _runningQueryIdMap:{ [id:string]:number; } = {};

	/**
	 * The pointer to the interval that cleans up expired queries
	 *
	 * @member {Object} core.search.SearchRequestManager~_runningQueriesLifetimeTimeout
	 */
	private _runningQueriesLifetimeTimeout:number = -1;

	/**
	 * The internally used search client to store and load queries and results from the database
	 *
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

		this._createAndStoreQueryId((id:string, expiryTimestamp:number) => {

			// add queryId and expiryTimestamp to the query object
			queryBody = ObjectUtils.extend(queryBody, {
				queryId        : id,
				expiryTimestamp: expiryTimestamp
			});

			this._searchClient.createOutgoingQuery(this._indexName, id, queryBody, (err) => {
				if (err) {
					id = null;
				}

				internalCallback(err, id);

				if (id) {
					this._triggerQueryAdd(id);
				}
			});
		});
	}

	public addResponse (queryId:string, responseBodies:BufferListInterface, responseMeta:Object, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var returned:number = 0;
		var response:any = null;
		var checkAndTriggerCallback:Function = function (err) {
			returned++;

			if (returned === response.hits.length || err) {
				returned = -1;
				return internalCallback(err);
			};
		};

		try {
			response = JSON.parse(responseBodies.toString());
		}
		catch (e) {
			return internalCallback(e);
		}

		console.log('parsed response', response);

		if (!(response && response.hits && response.hits.length)) {
			return internalCallback(null);
		}

		console.log('got hits!');

		for (var i = 0, l = response.hits.length; i < l; i++) {
			this._addResponse(queryId, response.hits[i], responseMeta, function (err) {
				return checkAndTriggerCallback(err);
			});
		}
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchClient.close((err:Error) => {

			this._runningQueryIds = null;
			this._runningQueryIdMap = null;

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

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._runningQueryIds = {};
		this._runningQueryIdMap = {};

		this._searchClient.open((err) => {
			if (err) {
				return internalCallback(err);
			}

			this._searchClient.createOutgoingQueryIndex(this._indexName, (err:Error) => {
				if (!this._eventEmitter) {
					this._eventEmitter = new events.EventEmitter();
				}

				this._startRunningQueriesLifetime();

				this._isOpen = true;

				return internalCallback(err);
			});
		});
	}

	public onQueryAdd (callback:Function):void {
		this._eventEmitter.addListener('queryAdd', callback);
	}

	public onQueryEnd (callback:Function):void {
		this._eventEmitter.addListener('queryEnd', callback);
	}

	public onQueryRemoved (callback:Function):void {
		this._eventEmitter.addListener('queryRemoved', callback);
	}

	public onQueryResultsChanged (callback:Function):void {
		this._eventEmitter.addListener('resultsChanged', callback);
	}

	public onQueryTimeout (callback:Function):void {
		this._eventEmitter.addListener('queryTimeout', callback);
	}

	public removeQuery (queryId:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._searchClient.deleteOutgoingQuery(this._indexName, queryId, (err:Error) => {
			this._triggerQueryRemoved(queryId);
			//this._checkResultsAndTriggerEvent(this._runningQueryIdMap[queryId]);

			return internalCallback(err);
		});
	}

	private _addResponse (queryId:string, responseBody:Object, responseMeta:Object, callback:(err:Error) => any):void {
		this._searchClient.addIncomingResponse(this._indexName, queryId, responseBody, responseMeta, (err:Error, response:Object) => {
			if (err) {
				console.error(err);
				return callback(err);
			}

			if (response && response['matches'] && response['matches'].length) {
				response['matches'].forEach((match) => {
					var queryId = match['_id'];
					var expiryTimestamp:number = this._runningQueryIdMap[queryId];

					if (expiryTimestamp) {
						this._runningQueryIds[expiryTimestamp].count++;
					}

					if (queryId) {
						this._triggerResultsChanged(queryId);
					}
				})
			}

			return callback(null);
		});
	}

	/**
	 * Checks weather the query for the given exiryTimestamp got any results yet and triggers a [`queryEnd`]{@link core.search.SearchRequestManager~_triggerQueryEnd} event if the
	 * query got a response. If no results have arrived the query will be deleted from the database and a
	 * [`queryTimeout`]{@link core.search.SearchRequestManager~_triggerQueryTimeout} event will be triggered afterwards.
	 *
	 * @method core.search.SearchRequestManager~_checkResultsAndTriggerEvent
	 *
	 * @param {number} expiryTimestamp
	 */
	private _checkResultsAndTriggerEvent (expiryTimestamp):void {
		var queryId:string;

		if (!this._runningQueryIds[expiryTimestamp]) {
			return;
		}

		queryId = this._runningQueryIds[expiryTimestamp].id;

		// trigger queryEnd event for queries with responses
		if (this._runningQueryIds[expiryTimestamp].count) {
			this._triggerQueryEnd(queryId);
		}
		// remove query and trigger timeout event for queries without a response
		else {
			this._searchClient.deleteOutgoingQuery(this._indexName, queryId, (err:Error) => {
				if (err) {
					console.error(err);
				}

				return this._triggerQueryTimeout(queryId);
			});
		}
	}

	/**
	 * Removes all related data to the given `queryId` from the internal lists.
	 *
	 * @method core.search.SearchRequestManager~_cleanupQueryLists
	 *
	 * @param {string} queryId
	 */
	private _cleanupQueryLists (queryId:string):void {
		var expiryTimestamp = this._runningQueryIdMap[queryId];

		this._runningQueryIdMap[queryId] = null;
		delete this._runningQueryIdMap[queryId]

		this._runningQueryIds[expiryTimestamp] = null;
		delete this._runningQueryIds[expiryTimestamp];
	}

	/**
	 * Creates a random queryId and exploration date and stores it in the internal lists before calling the callback with
	 * the generated data as arguments.
	 *
	 * @method core.search.SearchRequestManager~_createAndStoreQueryId
	 *
	 * @param callback The callback that will be called after the generation of the data with `queryId` and `expiryTimestamp` as arguments.
	 */
	private _createAndStoreQueryId (callback:(id:string, expiryTimestamp:number) => any):void {
		crypto.randomBytes(16, (ex, buf) => {
			var id = buf.toString('hex');
			var lifetime:number = this._config.get('search.queryLifetimeInSeconds') * 1000;
			var expiryTimestamp:number = new Date().getTime() + lifetime;

			this._runningQueryIds[expiryTimestamp] = {
				id   : id,
				count: 0
			};

			this._runningQueryIdMap[id] = expiryTimestamp;

			return callback(id, expiryTimestamp);
		});
	}

	/**
	 * Iterates over the running queries and cleans up expired queries. It uses {@link core.search.SearchRequestManager~_checkResultsAndTriggerEvent}
	 * to trigger a `queryTimeout` or `queryEnd` event.
	 *
	 * @method core.search.SearchRequestManager~_removeExpiredQueries
	 */
	private _removeExpiredQueries ():void {
		var now:number = new Date().getTime();
		var currentQueries:Array<number> = <any>Object.keys(this._runningQueryIds);

		var newRunningQueryIds:{ [expiryTimestamp:number]:{ id:string; count:number;}; } = {};
		currentQueries.forEach((expiryTimestamp) => {
			// keep alive queries
			if (expiryTimestamp > now) {
				newRunningQueryIds[expiryTimestamp] = this._runningQueryIds[expiryTimestamp];
			}
			else {
				this._checkResultsAndTriggerEvent(expiryTimestamp);
			}
		});

		this._runningQueryIds = newRunningQueryIds;
	}

	/**
	 * Starts the the runner that removes expired queries in a specified interval.
	 *
	 * @see core.search.SearchRequestManager~_removeExpiredQueries
	 *
	 * @method core.search.SearchRequestManager~_startRunningQueriesLifetime
	 */
	private _startRunningQueriesLifetime ():void {
		this._runningQueriesLifetimeTimeout = global.setTimeout(() => {
			this._removeExpiredQueries();
			this._startRunningQueriesLifetime();
		}, this._config.get('search.searchRequestManager.queryLifetimeIntervalInMilliSeconds'));
	}

	/**
	 * Stops the interval that cleans up expired queries.
	 *
	 * @method core.search.SearchRequestManager~_stopRunningQueriesLifetime
	 */
	private _stopRunningQueriesLifetime ():void {
		if (this._runningQueriesLifetimeTimeout) {
			global.clearTimeout(this._runningQueriesLifetimeTimeout);
			this._runningQueriesLifetimeTimeout = null;
		}
	}

	/**
	 * Triggers the `queryAdd` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryAdd
	 *
	 * @method core.search.SearchRequestManager~_triggerQueryAdd

	 * @param {string} queryId The id of the added search query
	 */
	private _triggerQueryAdd (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryAdd', queryId);
		}
	}

	/**
	 * Triggers the `queryEnd` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryEnd
	 *
	 * @method core.search.SearchRequestManager~_triggerQueryEnd
	 *
	 * @param {string} queryId The id of the ended search query
	 */
	private _triggerQueryEnd (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryEnd', queryId);
		}

		this._cleanupQueryLists(queryId);
	}

	/**
	 * Triggers the `queryRemoved` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryRemoved
	 *
	 * @method core.search.SearchRequestManager~_triggerQueryRemoved
	 *
	 * @param {string} queryId The id of the removed search query
	 */
	private _triggerQueryRemoved (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryRemoved', queryId);
		}

		this._cleanupQueryLists(queryId);
	}

	/**
	 * Triggers the `queryTimeout` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryTimeout
	 *
	 * @method core.search.SearchRequestManager~_triggerQueryTimeout
	 *
	 * @param {string} queryId The id of the timed out search query
	 */
	private _triggerQueryTimeout (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryTimeout', queryId);
		}

		this._cleanupQueryLists(queryId);
	}

	/**
	 * Triggers the `resultsChanged` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryResultsChanged
	 *
	 * @method core.search.SearchRequestManager~_triggerResultsChanged
	 *
	 * @param {string} queryId The id of query the has updated results
	 */
	private _triggerResultsChanged (queryId:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('resultsChanged', queryId);
		}
	}

}

export = SearchRequestManager;