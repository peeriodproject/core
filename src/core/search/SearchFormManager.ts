/// <reference path='../../main.d.ts' />

import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginManagerInterface = require('../plugin/interfaces/PluginManagerInterface');
import PluginRunnerInterface = require('../plugin/interfaces/PluginRunnerInterface');
import PluginRunnerMapInterface = require('../plugin/interfaces/PluginRunnerMapInterface');
import SearchFormManagerInterface = require('./interfaces/SearchFormManagerInterface');
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');

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

	constructor (config:ConfigInterface, stateHandlerFactory:StateHandlerFactoryInterface, pluginManager:PluginManagerInterface) {
		this._config = config;
		this._stateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('search.searchFormStateConfig')));
		this._pluginManager = pluginManager;

		this.open();
	}

	public addQuery (rawQuery:Object, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._pluginManager.getActivePluginRunner(this._currentFormIdentifier, (pluginRunner:PluginRunnerInterface) => {
			pluginRunner.getQuery(rawQuery, function (err:Error, query:Object) {
				console.log(err);

				if (err) {
					return internalCallback(err);
				}

				console.log('sending query down the wire', query);

				return internalCallback(null);
			});
		});
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._stateHandler.save({ currentForm: this._currentFormIdentifier }, internalCallback);
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
		var internalCallback = callback || function (err:Error) {};

		this._pluginManager.open((err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			this.getFormIdentifiers((identifiers:Array<string>) => {
				if (!identifiers.length) {
					return internalCallback(new Error('SearchFormManager#open: No identifiers to construct a search form found. Add a plugin or enable at least one.'));
				}

				this._stateHandler.load((err:Error, state:Object) => {
					if (err || !state || !state['currentForm'] || (identifiers.indexOf(state['currentForm']) === -1)) {
						this._currentFormIdentifier = identifiers[0];
					}

					this._isOpen = true;

					return internalCallback(null);
				});
			});
		})
	}

	public setForm (identifier:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		this._pluginManager.getActivePluginRunnerIdentifiers((identifiers) => {
			if (identifiers.indexOf(identifier) === -1) {
				return internalCallback(new Error('SearchFormManager#setForm: Could not activate the given identifier. The Idenifier is invalid'));
			}

			this._currentFormIdentifier = identifier;
		});
	}

}

export = SearchFormManager;