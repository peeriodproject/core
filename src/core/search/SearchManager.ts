/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginManagerInterface = require('../plugin/interfaces/PluginManagerInterface');
import PluginRunnerInterface = require('../plugin/interfaces/PluginRunnerInterface');
import SearchClientInterface = require('./interfaces/SearchClientInterface');
import SearchManagerInterface = require('./interfaces/SearchManagerInterface');

/**
 * @class core.search.SearchManager
 * @implements core.search.SearchManagerInterface
 */
class SearchManager implements SearchManagerInterface {

	private _config:ConfigInterface = null;

	private _isOpen:boolean = false;

	private _pluginManager:PluginManagerInterface = null;

	private _searchClient:SearchClientInterface = null;

	constructor (config:ConfigInterface, pluginManager:PluginManagerInterface, searchClient:SearchClientInterface) {
		this._config = config;
		this._pluginManager = pluginManager;
		this._searchClient = searchClient;

		this._registerPluginManagerEvents();
	}

	addItem (pathToIndex:string, stats:fs.Stats, callback?:(err:Error) => any):void {
		var internalCallback:Function = callback || function () {};

		this._pluginManager.onBeforeItemAdd(pathToIndex, stats, (pluginDatas:Object) => {

			//console.log(JSON.stringify(pluginDatas));
			// to the request to the database
			this._searchClient.addItem({}, function(err) {
				callback(err);
			});
		});
	}

	close (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		return process.nextTick(callback.bind(null, null));
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

	private _registerPluginManagerEvents ():void {
		// todo register on plugin delete handler and remove type from index
		this._pluginManager.addEventListener('pluginAdded', (pluginIdentifier) => {
			this._onPluginAddedListener(pluginIdentifier);
		});
	}

	private _onPluginAddedListener (pluginIdentifier:string):void {
		this._searchClient.typeExists(pluginIdentifier, (exists:boolean) => {
			if (exists) {
				return;
			}

			this._pluginManager.getActivePluginRunner(pluginIdentifier, (pluginRunner:PluginRunnerInterface) => {
				pluginRunner.getMapping((mapping:Object) => {
					if (mapping) {
						this._searchClient.addMapping(pluginIdentifier, mapping, function (err) {
							if (err) {
								console.error(err);
							}
						});
					}
					else {
						// todo plugin uses elasticsearch auto mapping feature! Maybe it's better to throw an error here?
					}
				});
			});
		});
	}

}

export = SearchManager;