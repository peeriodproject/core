import events = require('events');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchResponseManagerInterface = require('./interfaces/SearchResponseManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

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

	public onResultsFound (callback:(results:Array<Object>) => any):void {
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

	public valiateQueryAndTriggerResults (queryId:string, query:Object, callback:(err:Error) => any):void {

	}

}

export = SearchResponseManager;