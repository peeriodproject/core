import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchRequestManagerInterface = require('./interfaces/SearchRequestManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.search.SearchRequestManager
 * @extends core.search.SearchRequestManagerInterface
 */
class SearchRequestManager implements SearchRequestManagerInterface {

	/**
	 * @member {core.config.ConfigInterface} core.search.SearchRequestManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * @member {boolean} core.search.SearchRequestManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * @member {core.utils.ClosableAsyncOptions} core.search.SearchRequestManager~_options
	 */
	private _options:ClosableAsyncOptions = {}

	/**
	 * @member {core.search.SearchClientInterface} core.search.SearchRequestManager~_searchClient
	 */
	private _searchClient:SearchClientInterface = null;

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, searchClient:SearchClientInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onOpenCallback: function () {},
			onCloseCallback: function () {},
			closeOnProcessExit: true
		};

		this._config = config;
		this._searchClient = searchClient;
		this._options = ObjectUtils.extend(defaults, options);

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add((done) => {
				this.close(done);
			});
		}

		this.open();
	}

	public addQuery (query:Object, callback:(err:Error) => any):void {
		this._searchClient.
	}

	public close (callback?:(err:Error) => any):void {
		this._searchClient.close(callback);
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public open (callback?:(err:Error) => any):void {
		this._searchClient.open(callback);
	}

	public queryExists (callback:(exists:boolean) => any):void {

	}

	public onQueryResultsChanged (queryId:string, callback:Function):void {

	}

}

export = SearchRequestManager;