import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchResponseManagerInterface = require('./interfaces/SearchResponseManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * @class core.search.SearchResponseManager
 * @implements core.searchSearchResponseManagerInterface
 *
 * @param {core.utils.AppQuitHandlerInterface} appQuitHandler
 * @param {core.search.SearchClientInterface} searchClient
 * @param {core.utils.ClosableAsyncOptions} options
 */
class SearchResponseManager implements SearchResponseManagerInterface {

	/**
	 * The event emitter instance to trigger the `resultsFound` event.
	 *
	 * @see core.search.SearchResponeManager#onResultsFound
	 *
	 * @member {core.config.ConfigInterface} core.search.SearchResponseManager~_eventEmitter
	 */
	private _eventEmitter:events.EventEmitter = null;

	/**
	 * A flag indicates weather the SearchResponseManager is open or not.
	 *
	 * @member {boolean} core.search.SearchResponseManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
	 */
	private _options:ClosableAsyncOptions = {}

	/**
	 * The internally used search client to validate queries.
	 *
	 * @member {core.search.SearchClientInterface} core.search.SearchResponseManager~_searchClient
	 */
	private _searchClient:SearchClientInterface = null;

	constructor(appQuitHandler:AppQuitHandlerInterface, searchClient:SearchClientInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onOpenCallback    : function () {
			},
			onCloseCallback   : function () {
			},
			closeOnProcessExit: true
		};

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

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchClient.close((err:Error) => {

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

	public onNoResultsFound (callback:(queryId:string) => any):void {
		this._eventEmitter.addListener('noResultsFound', callback);
	}

	public onResultsFound (callback:(queryId:string, results:Buffer) => any):void {
		this._eventEmitter.addListener('resultsFound', callback);
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._searchClient.open((err) => {
			if (err) {
				return internalCallback(err);
			}

			if (!this._eventEmitter) {
				this._eventEmitter = new events.EventEmitter();
			}

			this._isOpen = true;

			return internalCallback(err);
		});
	}

	public validateQueryAndTriggerResults (queryId:string, queryBuffer:Buffer, callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		logger.log('search', 'SearchResponseManager~_validateQueryAndTriggerResults: got incoming query', {
			queryId: queryId
		});

		this._validateQuery(queryBuffer, (err:Error, queryObject:Object) => {
			if (err) {
				return internalCallback(err);
			}

			this._runQuery(queryObject, (err, results) => {
				if (err) {
					return internalCallback(err);
				}

				internalCallback(null);

				if (results && results['total']) {
					// todo add the ability to manipulate results via plugins before the event will be triggered
					return this._triggerResultsFound(queryId, results);
				}
				else {
					return this._triggerNoResultsFound(queryId);
				}
			});
		});
	}

	/**
	 * Queries the database with the given query and returns the results in the callback
	 *
	 * @method core.search.SearchResponseManager~_runQuery
	 *
	 * @param {Object} queryObject A valid elasticsearch query object. {@link http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/search-request-body.html}
	 * @param callback The callback that gets called with a possible error and the results object as arguments after the database returned it's state.
	 */
	private _runQuery(queryObject:Object, callback:(err:Error, results:Object) => any):void {
		this._searchClient.search(queryObject, (err:Error, results:any) => {
			var hits:Array<Object>;

			results = results || {};
			err = err || null;
			hits = results && results.hits ? results.hits : [];

			if (err || !hits.length) {
				return callback(err, null);
			}

			results.hits = this._cleanupHits(hits);

			return callback(null, results);
		});
	}

	/**
	 * Removes unused fields from the result list before returning it.
	 *
	 * @method core.search.SearchResponseManager~_cleanupHits
	 *
	 * @param {Array} hits The array of hits from elasticsearch. {@link http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search}
	 * @returns {Array}
	 */
	private _cleanupHits (hits:Array<Object>):Array<Object> {
		for (var i = 0, l = hits.length; i < l; i++) {
			var hit:any = hits[i];

			hit._id = hit._source.itemHash;

			delete hit._index;
			delete hit._source.itemPath;
			delete hit._source.itemHash;
		}

		return hits;
	}

	private _triggerNoResultsFound (queryId:string):void {
		if (this._isOpen) {
			logger.log('search', 'SearchResponseManager~_triggerNoResultsFound: no results found', {
				queryId: queryId
			});

			this._eventEmitter.emit('noResultsFound', queryId);
		}
	}

	/**
	 * Triggers the `resultsFound` event to all registered listeners.
	 *
	 * @see core.search.SearchResponseManager#onResultsFound
	 *
	 * @method core.search.SearchResponseManager~_triggerResultsFound
	 *
	 * @param {string} queryId The query id where the results belong to
	 * @param {Object} results The results object
	 */
	private _triggerResultsFound (queryId:string, results:Object):void {
		if (this._isOpen) {
			logger.log('search', 'SearchResponseManager~_triggerResultsFound: Results found', {
				queryId: queryId,
				results: results
			});

			this._eventEmitter.emit('resultsFound', queryId, new Buffer(JSON.stringify(results)));
		}
	}

	/**
	 * Validates the query by converting it to a JSON object.
	 * It returns an error as the first argument if the validation failed.
	 *
	 * @method core.search.SearchResponseManager~_validateQuery
	 * 
	 * @param {Buffer} queryBuffer
	 * @param {Function} callback The callback that gets called after the validation finished with a possible validation error and the query object as arguments
	 */
	private _validateQuery (queryBuffer:Buffer, callback:(err:Error, queryObject:Object) => any):void {
		var query:Object = {};

		try {
			query = JSON.parse(queryBuffer.toString());

			// todo limit/check valid elasticsearch keys

			return callback(null, query);
		}
		catch (e) {
			return callback(new Error('SearchResponseManager~_validateQuery: Could not parse the incoming query.'), null);
		}
	}

}

export = SearchResponseManager;