import SearchFormResultsManagerInterface = require('../../search/interfaces/SearchFormResultsManagerInterface');
import SearchRequestManagerInterface = require('../../search/interfaces/SearchRequestManagerInterface');

import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiSearchFormResultsManagerComponent
 * @implements core.ui.UiComponentInterface
 *
 * @param {core.search.SearchFormResultsManagerInterface} searchFormManager
 * @param {core.search.SearchRequestManagerInterface} searchRequestManager
 */
class UiSearchFormResultsManagerComponent extends UiComponent {

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
	 * todo ts-definition
	 *
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
						console.error(err);
					}

					return;
				}

				this._searchFormResultsManager.transformResponses(responses.hits, true, (err:Error, transformedResults) => {
					if (err) {
						console.error(err);

						return;
					}

					responses.hits = transformedResults;

					this._currentResults = responses;
					this.updateUi();
				});
			});
		});
	}

	/**
	 * Creates a new query if it differs from the stored {@link core.ui.UiSearchFormResultsManagerComponent~_runningQuery}
	 * and stores the `queryId` for further cleanup.
	 *
	 * @param rawQuery
	 */
	private _addQuery (rawQuery:any):void {
		if (this._runningQuery === rawQuery) {
			return;
		}

		this._searchFormResultsManager.addQuery(rawQuery, (err:Error, queryId:string) => {
			if (err) {
				console.error(err);
			}

			this._runningQuery = rawQuery;
			this._runningQueryId = queryId;

			return this.updateUi();
		});
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
				console.error(err);
			}
		});
	}

}

export = UiSearchFormResultsManagerComponent;