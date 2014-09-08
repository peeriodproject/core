import SearchFormResultsManagerInterface = require('../../search/interfaces/SearchFormResultsManagerInterface');
import SearchRequestManagerInterface = require('../../search/interfaces/SearchRequestManagerInterface');

import UiComponent = require('../UiComponent');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * @class core.ui.UiSearchFormResultsManagerComponent
 * @extends core.ui.UiComponent
 *
 * @param {core.search.SearchFormResultsManagerInterface} searchFormManager
 * @param {core.search.SearchRequestManagerInterface} searchRequestManager
 */
class UiSearchFormResultsManagerComponent extends UiComponent {

	/**
	 * todo docs
	 *
	 * @member {string} core.ui.UiSearchFormResultsManagerComponent~_runningQueryId
	 */
	private _currentResults:any = {};

	/**
	 * The internally used.SearchFormResultsManagerInterface instance to start new queries
	 *
	 * @member {core.search.SearchFormResultsManagerInterface} core.ui.UiSearchFormResultsManagerComponent~_searchFormResultsManager
	 */
	private _searchFormResultsManager:SearchFormResultsManagerInterface = null;

	/**
	 * The internally used SearchRequestManagerInterface to remove old queries
	 *
	 * @member {core.search.SearchRequestManagerInterface} core.ui.UiSearchFormResultsManagerComponent~_searchRequestManager
	 */
	private _searchRequestManager:SearchRequestManagerInterface = null;

	/**
	 * Stores the currently running `queryId`
	 *
	 * todo add the ability to run multiple queries in parallel aka tabs
	 *
	 * @member {string} core.ui.UiSearchFormResultsManagerComponent~_runningQueryId
	 */
	private _runningQueryId:string = null;

	/**
	 * Stores the status of the currently running query.
	 *
	 * @member {string}
	 */
	private _runningQueryStatus:string = null;

	/**
	 * todo ts-definition, docs
	 *
	 * @member {any} core.ui.UiSearchFormResultsManagerComponent~_runningQuery
	 */
	private _runningQuery:any = null;

	constructor (searchFormResultsManager:SearchFormResultsManagerInterface, searchRequestManager:SearchRequestManagerInterface) {
		super();

		this._searchFormResultsManager = searchFormResultsManager;
		this._searchRequestManager = searchRequestManager;

		this._setupEventListeners();
	}

	public getChannelName ():string {
		return 'search';
	}

	public getEventNames ():Array<string> {
		return ['addQuery', 'removeQuery'];
	}

	public getState (callback):void {
		return process.nextTick(callback.bind(null, {
			currentQuery: this._runningQuery,
			currentQueryStatus: this._runningQueryStatus,
			currentResults: this._currentResults
		}));
	}

	/**
	 * Sets up the `addQuery` and `removeQuery` event listener
	 *
	 * @method core.ui.UiSearchFormResultsManagerComponent~_setupEventListeners
	 */
	private _setupEventListeners ():void {
		this.on('addQuery', (rawQuery) => {
			this._removeRunningQuery();
			this._addQuery(rawQuery);
		});

		this.on('removeQuery', () => {
			this._removeRunningQuery();
			this._runningQuery = null;
			this._runningQueryId = null;
			this._runningQueryStatus = null;
			this._currentResults = null;

			return this.updateUi();
		});

		this._searchRequestManager.onQueryResultsChanged((queryId) => {

			if (queryId !== this._runningQueryId) {
				return;
			}

			this._searchRequestManager.getResponses(queryId, (err:Error, responses:any) => {
				if (err || !responses || !responses.total) {
					if (err) {
						logger.error('UiSearchFormResultsManager', {emsg: err.message});
					}

					return;
				}

				this._searchFormResultsManager.transformResponses(responses.hits, true, (err:Error, transformedResults) => {
					if (err) {
						logger.error('UiSearchFormResultsManager', {emsg: err.message});

						return;
					}

					responses.hits = transformedResults;

					this._currentResults = responses;
					this._updateQueryStatus('GOT_RESULTS');

					this.updateUi();
				});
			});
		});

		this._searchRequestManager.onQueryEnd((queryId, reason) => {
			this._handleQueryEnd(queryId, reason);
		});

		this._searchRequestManager.onQueryCanceled((queryId, reason) => {
			this._handleQueryEnd(queryId, reason);
		});
	}

	/**
	 * Creates a new query if it differs from the stored {@link core.ui.UiSearchFormResultsManagerComponent~_runningQuery}
	 * and stores the `queryId` for further cleanup.
	 *
	 * @method core.ui.UiSearchFormResultsManagerComponent~_addQuery
	 *
	 * @param rawQuery
	 */
	private _addQuery (rawQuery:any):void {
		if (this._runningQuery === rawQuery) {
			return;
		}

		this._searchFormResultsManager.addQuery(rawQuery, (err:Error, queryId:string) => {
			if (err) {
				logger.error('UiSearchFormResultsManager', {emsg: err.message});
			}

			this._runningQuery = rawQuery;
			this._runningQueryId = queryId;
			this._updateQueryStatus('CREATED');
			this._currentResults = null;

			this.updateUi();
		});
	}

	/**
	 * Sets the reason of the query end as the new status and triggers a ui update
	 *
	 * @method core.ui.UiSearchFormResultsManagerComponent~_handleQueryEnd
	 *
	 * @param {string} queryId
	 * @param {string} reason
	 */
	private _handleQueryEnd (queryId:string, reason:string):void {
		if (queryId !== this._runningQueryId) {
			return;
		}

		this._updateQueryStatus(reason);

		this.updateUi();
	}

	/**
	 * Removes the running query from the database
	 *
	 * @method core.ui.UiSearchFormResultsManagerComponent~_removeRunningQuery
	 */
	private _removeRunningQuery ():void {
		if (!this._runningQueryId) {
			return;
		}

		this._searchRequestManager.removeQuery(this._runningQueryId, (err:Error) => {
			if (err) {
				logger.error('UiSearchFormResultsManager', {emsg: err.message});
			}
		});
	}

	private _updateQueryStatus (status:string):void {
		this._runningQueryStatus = status;
	}

}

export = UiSearchFormResultsManagerComponent;