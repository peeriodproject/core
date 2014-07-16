/// <reference path='../../main.d.ts' />

import path = require('path');

import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginManagerInterface = require('../plugin/interfaces/PluginManagerInterface');
import PluginRunnerInterface = require('../plugin/interfaces/PluginRunnerInterface');
import PluginRunnerMapInterface = require('../plugin/interfaces/PluginRunnerMapInterface');
import SearchFormManagerInterface = require('./interfaces/SearchFormManagerInterface');
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');
import SearchRequestManagerInterface = require('./interfaces/SearchRequestManagerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.search.SearchFormManager
 * @implements core.search.SearchFormManagerInterface
 */
class SearchFormManager implements SearchFormManagerInterface {

	private _config:ConfigInterface = null;

	private _currentFormIdentifier:string = null;

	private _isOpen:boolean = false;

	private _pluginManager:PluginManagerInterface = null;

	private _stateHandler:StateHandlerInterface = null;

	private _searchRequestManager:SearchRequestManagerInterface = null;

	private _options:ClosableAsyncOptions = {};

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, stateHandlerFactory:StateHandlerFactoryInterface, pluginManager:PluginManagerInterface, searchRequestManager:SearchRequestManagerInterface, options:ClosableAsyncOptions = {}) {
		var defaults = {
			closeOnProcessExit: true,
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._stateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('search.searchFormStateConfig')));
		this._pluginManager = pluginManager;
		this._searchRequestManager = searchRequestManager;

		this._options = ObjectUtils.extend(defaults, options);

		if (this._options.closeOnProcessExit) {
			appQuitHandler.add(() => {
				this.close(this._options.onCloseCallback);
			});
		}

		this.open(this._options.onOpenCallback);
	}

	public addQuery (rawQuery:any, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._pluginManager.getActivePluginRunner(this._currentFormIdentifier, (pluginRunner:PluginRunnerInterface) => {
			pluginRunner.getQuery(rawQuery, (err:Error, query:Object) => {
				if (err) {
					console.log(err);
					return internalCallback(err);
				}

				return this._searchRequestManager.addQuery(query, internalCallback);
			});
		});
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._stateHandler.save({ currentForm: this._currentFormIdentifier }, (err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			this._isOpen = false;

			return internalCallback(null);
		});
	}

	public getFormIdentifiers (callback:(identifiers:Array<string>) => any):void {
		this._pluginManager.getActivePluginRunnerIdentifiers(callback);
	}

	public getCurrentFormIdentifier (callback:(identifier:string) => any):void {
		return process.nextTick(callback.bind(null, this._currentFormIdentifier));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._pluginManager.open((err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			this.getFormIdentifiers((identifiers:Array<string>) => {
				if (!identifiers.length) {
					return internalCallback(new Error('SearchFormManager#open: No identifiers to construct a search form found. Add a plugin or activate at least one.'));
				}

				this._stateHandler.load((err:Error, state:Object) => {
					if (err || !state || !state['currentForm']) {
						this._currentFormIdentifier = identifiers[0];
					}
					else {
						err = this._setForm(identifiers, state['currentForm']);
					}

					if (!err) {
						this._isOpen = true;
					}

					return internalCallback(err);
				});
			});
		})
	}

	public setForm (identifier:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {
		};

		this.getFormIdentifiers((identifiers) => {
			var err = this._setForm(identifiers, identifier);

			return internalCallback(err);
		});
	}

	private _setForm (identifiers:Array<string>, identifier:string):Error {
		if (identifiers.indexOf(identifier) === -1) {
			return new Error('SearchFormManager#setForm: Could not activate the given identifier. The Identifier "' + identifier + '" is invalid');
		}

		this._currentFormIdentifier = identifier;

		return null;
	}

}

export = SearchFormManager;