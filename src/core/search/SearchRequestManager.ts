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
	 * A map of currently running search query bodies. The identifier is the `queryId` and the value the [query body]{@link http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/search-request-body.html}
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_runningQueries
	 */
	private _runningQueries:{ [queryId:string]:Object } = {};

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

		this._createAndStoreQueryId(queryBody, (queryId:string) => {
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
					this._triggerQueryAdd(queryId, queryBody);
				}
			});
		});
	}

	public addResponse (queryId:string, responseBody:Buffer, responseMeta:Object, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};
		var returned:number = 0;
		var response:any = null;
		var checkAndTriggerCallback:Function = function (err) {
			returned++;

			if (returned === response.hits.length || err) {
				returned = -1;

				return internalCallback(err);
			}
		};

		logger.log('search', 'received response', {
			queryId  : queryId,
			eventName: 'RECEIVED_RESULTS'
		});

		try {
			response = JSON.parse(responseBody.toString());
		}
		catch (e) {
			return internalCallback(e);
		}

		if (!(response && response.hits && response.hits.length)) {
			logger.log('search', 'SearchRequestManager#addResponse: invalid Response', {
				queryId : queryId,
				response: response
			});

			return internalCallback(null);
		}

		for (var i = 0, l = response.hits.length; i < l; i++) {
			this._checkAndAddResponse(queryId, response.hits[i], responseMeta, function (err) {
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

	// todo add timestamp to query to fetch just the lastest results
	public getResponses (queryId:string, callback:(err:Error, responses:any) => any):void {
		this._getQuery(queryId, (err:Error, queryBody:Object) => {
			if (err) {
				return callback(err, null);
			}

			this._searchClient.getIncomingResponses(this._indexName, queryId, queryBody, callback);
		});
	}

	public onQueryAdd (callback:(queryId:string, queryBody:Object) => any):void {
		this._eventEmitter.addListener('queryAdd', callback);
	}

	public onQueryEnd (callback:(queryId:string, reason:string) => any):void {
		this._eventEmitter.addListener('queryEnd', callback);
	}

	public onQueryRemoved (callback:(queryId:string) => any):void {
		this._eventEmitter.addListener('queryRemoved', callback);
	}

	public onQueryResultsChanged (callback:(queryId:string) => any):void {
		this._eventEmitter.addListener('resultsChanged', callback);
	}

	public onQueryCanceled (callback:(queryId:string, reason:string) => any):void {
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
					logger.error(err);
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

			return internalCallback(err);
		});
	}

	private _checkAndAddResponse (queryId:string, responseBody:Object, responseMeta:Object, callback:(err:Error) => any):void {
		if (this._runningQueryIds[queryId] === undefined) {
			logger.log('search', 'SearchRequestManager: no running query for the given queryId found', {
				queryId  : queryId,
				eventName: 'QUERY_NOT_RUNNING'
			});

			return process.nextTick(callback.bind(null, null));
		}

		responseBody = this._transformResponseBody(responseBody);

		this._searchClient.checkIncomingResponse(this._indexName, queryId, responseBody, (err:Error, matches:Array<Object>) => {
			if (err || !(matches && matches.length)) {
				if (err) {
					logger.error(err);
				}

				return callback(err);
			}

			this._searchClient.addIncomingResponse(this._indexName, queryId, responseBody, responseMeta, (err:Error) => {
				if (err) {
					logger.error(err);

					return callback(err);
				}

				for (var i = 0, l = matches.length; i < l; i++) {
					var match = matches[i];

					if (match['_id'] !== queryId) {
						continue;
					}

					callback(null);

					if (this._runningQueryIds[queryId] !== undefined) {
						this._runningQueryIds[queryId]++;

						this._triggerResultsChanged(queryId);
					}
					else {
						logger.log('search', 'SearchRequestManager: query is not running anymore', {
							queryId  : queryId,
							eventName: 'QUERY_NOT_RUNNING'
						});
					}

				}
			});

			return callback(null);
		});
	}

	/**
	 * Returns the corresponding query object to the given `queryId` from the database
	 *
	 * @param {string} queryId
	 * @param {Function} callback
	 */
	private _getQuery (queryId:string, callback:(err:Error, queryBody:Object) => void):void {
		var cachedQueryBody:Object = this._runningQueries[queryId];

		if (cachedQueryBody) {
			return process.nextTick(callback.bind(null, null, cachedQueryBody));
		}

		this._searchClient.getOutgoingQuery(this._indexName, queryId, (err:Error, queryBody) => {
			this._runningQueries[queryId] = queryBody;

			return callback(err, queryBody);
		});
	}

	/**
	 * Transforms the given response from a hit object to a item that can be stored in the database.
	 * Basically the `_source` key will be removed and all nested keys will be placed on the object root. Furthermore all
	 * fields under the `highlight` key will be added to the object root if they do not exist yet.
	 *
	 * @param {Object} body A single hit from elasticsearch
	 * @returns {Object} The transformed body
	 */
	private _transformResponseBody (body):Object {
		var keys = Object.keys(body);
		var newBody = {};

		var addToTopLevel = function (parentKey) {
			if (!body[parentKey]) {
				return;
			}

			var keys = Object.keys(body[parentKey]);
			for (var i = 0, l = keys.length; i < l; i++) {
				var key = keys[i];

				if (newBody[key] === undefined) {
					newBody[key] = body[parentKey][key];
				}
			}
		};

		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];

			if (['_source', 'highlight'].indexOf(key) === -1) {
				newBody[key] = body[key];
			}
		}

		if (body['_source']) {
			addToTopLevel('_source');
		}

		if (body['highlight']) {
			addToTopLevel('highlight');
		}

		return newBody;
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
		this._runningQueries[queryId] = null;

		delete this._runningQueryIds[queryId];
		delete this._runningQueries[queryId];
	}

	/**
	 * Creates a random queryId and exploration date and stores it in the internal lists before calling the callback with
	 * the generated data as arguments.
	 *
	 * @method core.search.SearchRequestManager~_createAndStoreQueryId
	 *
	 * @param {Function} callback The callback that will be called after the generation of the data with `queryId` as first argument.
	 */
	private _createAndStoreQueryId (queryBody, callback:(id:string) => any):void {
		crypto.randomBytes(16, (ex, buf) => {
			var id = buf.toString('hex');

			this._runningQueryIds[id] = 0;
			// todo we could cache the query here and wouldn't need a single database call at all. But to prevent inconsistency the first request requires a database call.
			//this._runningQueries[id] = queryBody;

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

			logger.log('search', 'SearchRequestManager: Starting query', {
				queryId  : queryId,
				queryBody: queryBody,
				eventName: 'QUERY_ADD'
			});
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

			logger.log('search', 'SearchRequestManager: query end', {
				queryId     : queryId,
				reason      : reason,
				eventName   : 'QUERY_END',
				resultsCount: this._runningQueryIds[queryId]
			});
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

			logger.log('search', 'SearchRequestManager: query removed', {
				queryId  : queryId,
				eventName: 'QUERY_REMOVED'
			});
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

			logger.log('search', 'SearchRequestManager: query canceled', {
				queryId  : queryId,
				reason   : reason,
				eventName: 'QUERY_CANCELED'
			});
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

			logger.log('search', 'SearchRequestManager: results changed', {
				queryId  : queryId,
				eventName: 'RESULTS_CHANGED'
			});
		}
	}

}

export = SearchRequestManager;