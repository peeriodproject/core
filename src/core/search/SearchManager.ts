/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginManagerInterface = require('../plugin/interfaces/PluginManagerInterface');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchManagerInterface = require('./interfaces/SearchManagerInterface');

class SearchManager implements SearchManagerInterface {

	private _config:ConfigInterface = null;

	private _isOpen:boolean = false;

	private _pluginManager:PluginManagerInterface = null;

	private _searchClient:SearchClientInterface = null;

	constructor(config:ConfigInterface, pluginManager:PluginManagerInterface, searchClient:SearchClientInterface) {
		this._config = config;
		this._pluginManager = pluginManager;
		this._searchClient = searchClient;
	}

	addItem (pathToIndex:string, stats:fs.Stats, callback?:(err:Error) => any):void {

		this._pluginManager.onBeforeItemAdd(pathToIndex, stats, () => {
			// to the request to the database
			//this._searchClient

			// call callback
		});
	}

	close (callback?:(err:Error) => any):void {

	}

	public getItem (pathToIndex:string, callback:(hash:string, stats:fs.Stats) => any):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}

	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public itemExists (pathToIndex:string, callback:(exists:boolean) => void):void {
		// todo iplementation
		return process.nextTick(callback.bind(null, null, null));
	}

	open (callback?:(err:Error) => any):void {

	}

}

export = SearchManager;