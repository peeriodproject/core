import crypto = require('crypto');
import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import BufferListInterface = require('../utils/interfaces/BufferListInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchRequestManagerInterface = require('./interfaces/SearchRequestManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

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
	 * The event emitter instance to trigger events.
	 *
	 * @see core.search.SearchRequestManager#onQueryAdd
	 * @see core.search.SearchRequestManager#onQueryEnd
	 * @see core.search.SearchRequestManager#onQueryRemoved
	 * @see core.search.SearchRequestManager#onQueryResultsChanged
	 * @see core.search.SearchRequestManager#onQueryCanceled
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
	 * A map of currently running search queries. The identifier is the `queryId and the value is the amount of results
	 * that already arrived.
	 *
	 * @member {Object} core.search.SearchRequestManager~_runningQueries
	 */
	private _runningQueryIds:{ [queryId:string]:number } = {};

	/**
	 * The internally used search client to store and load queries and results from the database
	 *
	 * @member {core.search.SearchClientInterface} core.search.SearchRequestManager~_searchClient
	 */
	private _searchClient:SearchClientInterface = null;

	constructor (appQuitHandler:AppQuitHandlerInterface, indexName:string, searchClient:SearchClientInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onOpenCallback    : function () {
			},
			onCloseCallback   : function () {
			},
			closeOnProcessExit: true
		};

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

		this._createAndStoreQueryId((queryId:string) => {
			// add queryId to the query object
			var extendedQueryBody:Object = ObjectUtils.extend(queryBody, {
				queryId: queryId
			});

			this._searchClient.createOutgoingQuery(this._indexName, queryId, extendedQueryBody, (err) => {
				if (err) {
					queryId = null;
				}

				internalCallback(err, queryId);

				if (queryId) {
					logger.log('search', 'SearchRequestManager#addQuery: Added outgoing query', {
						queryId: queryId,
						body: queryBody
					});
					this._triggerQueryAdd(queryId, queryBody);
				}
			});
		});
	}

	public addResponse (queryId:string, responseBody:Buffer, responseMeta:Object, callback?:(err:Error) => any):void {
		logger.log('search', 'SearchRequestManager#addResponse: Got response', {
			queryId: queryId
		});

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
			response = JSON.parse(responseBody.toString());
		}
		catch (e) {
			return internalCallback(e);
		}

		if (!(response && response.hits && response.hits.length)) {
			return internalCallback(null);
		}

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

			//this._eventEmitter.emit('close');
			this._eventEmitter.removeAllListeners();
			this._eventEmitter = null;

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

		this._searchClient.open((err) => {
			if (err) {
				return internalCallback(err);
			}

			this._searchClient.createOutgoingQueryIndex(this._indexName, (err:Error) => {
				if (!this._eventEmitter) {
					this._eventEmitter = new events.EventEmitter();
				}

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

	public onQueryCanceled (callback:Function):void {
		this._eventEmitter.addListener('queryCanceled', callback);
	}

	public queryEnded (queryId:string, reason:string):void {
		// not found check
		if (this._runningQueryIds[queryId] === undefined) {
			return;
		}

		// trigger queryEnd event for queries with responses
		if (this._runningQueryIds[queryId]) {
			this._triggerQueryEnd(queryId, reason);
		}
		// remove query and trigger canceled event for queries without a response
		else {
			this._searchClient.deleteOutgoingQuery(this._indexName, queryId, (err:Error) => {
				if (err) {
					console.error(err);
				}

				return this._triggerQueryCanceled(queryId, reason);
			});
		}
	}

	public removeQuery (queryId:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._searchClient.deleteOutgoingQuery(this._indexName, queryId, (err:Error) => {
			this._triggerQueryRemoved(queryId);
			//this._checkResultsAndTriggerEvent(this._runningQueryIdMap[queryId]);
			logger.log('search', 'SearchRequestManager#removeQuery: Removed query', {
				queryId: queryId
			});

			return internalCallback(err);
		});
	}

	private _addResponse (queryId:string, responseBody:Object, responseMeta:Object, callback:(err:Error) => any):void {
		if (this._runningQueryIds[queryId] === undefined) {
			return process.nextTick(callback.bind(null, null));
		}

		if (responseBody && responseBody['highlight']) {
			var highlightedFieldKeys = Object.keys(responseBody['highlight']);

			// added source
			if (!responseBody['_source']) {
				responseBody['_source'] = {};
			}

			if (highlightedFieldKeys.length) {
				// map highlight.field to _source.field
				for (var i = 0, l = highlightedFieldKeys.length; i < l; i++) {
					var key = highlightedFieldKeys[i];

					if (!responseBody['_source'][key]) {
						responseBody['_source'][key] = responseBody['highlight'][key];
					}
				}
			}
		}

		this._searchClient.addIncomingResponse(this._indexName, queryId, responseBody, responseMeta, (err:Error, response:Object) => {
			if (err) {
				console.error(err);
				return callback(err);
			}

			logger.log('search', 'SearchRequestManager~_addQuery: Added incoming response to database', {
				queryId: queryId,
				body: responseBody
			});

			if (response && response['matches'] && response['matches'].length) {
				logger.log('search', 'SearchRequestManager~_addQuery: Incoming response matched a running query!', {
					queryId: queryId,
					matches: response['matches']
				});

				response['matches'].forEach((match) => {
					if (this._runningQueryIds[queryId] !== undefined) {
						this._runningQueryIds[queryId]++;
						this._triggerResultsChanged(queryId);
					}
				})
			}

			return callback(null);
		});
	}

	/**
	 * Removes all related data to the given `queryId` from the internal list.
	 *
	 * @method core.search.SearchRequestManager~_cleanupQueryLists
	 *
	 * @param {string} queryId
	 */
	private _cleanupQueryLists (queryId:string):void {
		this._runningQueryIds[queryId] = null;
		delete this._runningQueryIds[queryId]
	}

	/**
	 * Creates a random queryId and exploration date and stores it in the internal lists before calling the callback with
	 * the generated data as arguments.
	 *
	 * @method core.search.SearchRequestManager~_createAndStoreQueryId
	 *
	 * @param {Function} callback The callback that will be called after the generation of the data with `queryId` as first argument.
	 */
	private _createAndStoreQueryId (callback:(id:string) => any):void {
		crypto.randomBytes(16, (ex, buf) => {
			var id = buf.toString('hex');

			this._runningQueryIds[id] = 0;

			return callback(id);
		});
	}

	/**
	 * Triggers the `queryAdd` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryAdd
	 *
	 * @method core.search.SearchRequestManager~_triggerQueryAdd

	 * @param {string} queryId The id of the added search query
	 * @param {Object} queryBody The body of the added search query
	 */
	private _triggerQueryAdd (queryId:string, queryBody:Object):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryAdd', queryId, new Buffer(JSON.stringify(queryBody)));
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
	 * @param {string} reason The reason why the query was ended
	 */
	private _triggerQueryEnd (queryId:string, reason:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryEnd', queryId, reason);
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
	 * Triggers the `queryCanceled` event to registered listeners if the manager is open.
	 *
	 * @see core.search.SearchRequestManager#onQueryCanceled
	 *
	 * @method core.search.SearchRequestManager~_triggerQueryCanceled
	 *
	 * @param {string} queryId The id of the timed out search query
	 * @param {string} reason The reason why the query was canceled.
	 */
	private _triggerQueryCanceled (queryId:string, reason:string):void {
		if (this._isOpen) {
			this._eventEmitter.emit('queryCanceled', queryId, reason);
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