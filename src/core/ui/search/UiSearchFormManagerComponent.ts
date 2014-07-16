import SearchFormManagerInterface = require('../../search/interfaces/SearchFormManagerInterface');
import SearchRequestManagerInterface = require('../../search/interfaces/SearchRequestManagerInterface');

import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiSearchFormManagerComponent
 * @implements core.ui.UiComponentInterface
 *
 * @param {core.search.SearchFormManagerInterface} searchFormManager
 * @param {core.search.SearchRequestManagerInterface} searchRequestManager
 */
class UiSearchFormManagerComponent extends UiComponent {

	/**
	 * The internally used SearchFormManagerInterface instance to start new queries
	 *
	 * @member {core.search.SearchFormManagerInterface} core.ui.UiSearchFormManager~_searchFormManager
	 */
	private _searchFormManager:SearchFormManagerInterface = null;

	/**
	 * The internally used SearchRequestManagerInterface to remove old queries
	 *
	 * @member {core.search.SearchRequestManagerInterface} core.ui.UiSearchFormManager~_searchRequestManager
	 */
	private _searchRequestManager:SearchRequestManagerInterface = null;

	/**
	 * Stores the currently running `queryId`
	 *
	 * todo add the ability to run multiple queries in parallel aka tabs
	 *
	 * @member {string} core.ui.UiSearchFormManager~_runningQueryId
	 */
	private _runningQueryId:string = null;

	/**
	 * todo ts-definition
	 *
	 */
	private _runningQuery:any = null;

	constructor (searchFormManager:SearchFormManagerInterface, searchRequestManager:SearchRequestManagerInterface) {
		super();

		this._searchFormManager = searchFormManager;
		this._searchRequestManager = searchRequestManager;

		this._setupEventListeners();
	}

	public getChannelName ():string {
		return 'search';
	}

	public getEventNames ():Array<string> {
		return ['addQuery', 'removeQuery'];
	}

	public getState ():Object {
		return {
			currentQuery: this._runningQuery
		};
	}

	/**
	 * Sets up the `addQuery` and `removeQuery` event listener
	 *
	 * @method core.ui.UiSearchFormManager~_setupEventListeners
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

			return this.updateUi();
		})
	}

	/**
	 * Creates a new query and stores the `queryId` for further cleanup
	 *
	 * @param rawQuery
	 */
	private _addQuery (rawQuery:any):void {
		this._searchFormManager.addQuery(rawQuery, (err:Error, queryId:string) => {
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
	 * @method core.ui.UiSearchFormManager~_removeRunningQuery
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

export = UiSearchFormManagerComponent;