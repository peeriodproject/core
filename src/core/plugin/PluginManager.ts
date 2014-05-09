/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');
import path = require('path');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginFinderInterface = require('./interfaces/PluginFinderInterface');
import PluginManagerInterface = require('./interfaces/PluginManagerInterface');
import PluginStateInterface = require('./interfaces/PluginStateInterface');
import PluginStateObjectInterface = require('./interfaces/PluginStateObjectInterface');
import PluginStateObjectListInterface = require('./interfaces/PluginStateObjectListInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.plugin.PluginManager
 * @implements PluginManagerInterface
 */
class PluginManager implements PluginManagerInterface {

	/**
	 * The internally used config object instance
	 *
	 * @member {core.config.ConfigInterface} core.plugin.PluginManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * A flag indicates weather the store is open or closed
	 *
	 * @member {boolean} core.plugin.PluginManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 *
	 * @member {core.utils.ClosableAsyncOptions} core.plugin.PluginManager~_options
	 */
	private _options:ClosableAsyncOptions = {};

	/**
	 * The internally used plugin finder instance
	 *
	 * @member {core.config.ConfigInterface} core.plugin.PluginManager~_pluginFinder
	 */
	private _pluginFinder:PluginFinderInterface = null;

	/**
	 * Represents the state of activated, deactivated and idle plugins
	 *
	 * @member {core.plugin.PluginStateInterface} core.plugin.PluginManager~_pluginState
	 */
	private _pluginState:PluginStateInterface = null;

	constructor (config:ConfigInterface, pluginFinder:PluginFinderInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onCloseCallback   : function (err:Error) {
			},
			onOpenCallback    : function (err:Error) {
			}
		};

		this._config = config;
		this._pluginFinder = pluginFinder;
		this._options = ObjectUtils.extend(defaults, options);

		this.open(this._options.onOpenCallback);
	}

	/*public checkPluginFolderForNewPlugins(callback:(err:Error, pluginPaths:PluginPathListInterface) => void):void {

	}*/

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return internalCallback(null);
		}

		this._savePluginState(function (err:Error) {
			if (err) {
				internalCallback(err);
			}
			else {
				this._isOpen = false;
				internalCallback(null);
			}
		});

	}

	public findNewPlugins (callback?:(err:Error) => void):void {
		var internalCallback = callback || function (err:Error) {};

		this._pluginFinder.findPlugins(internalCallback);
	}

	// todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return callback(null, this._isOpen);
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (this._isOpen) {
			return internalCallback(null);
		}

		// todo add callback and move isOpen to the callback
		this._loadPluginState((err:Error, pluginState:any) => {
			if (err) {
				internalCallback(err);
			}
			else {
				//console.log('got the plugin state. do something with it!');
				// this._pluginState = pluginState

				this._isOpen = true;
				internalCallback(null);
			}
		});
	}

	/**
	 * Returns the path where the manager should load/store the plugin state
	 *
	 * @method core.plugin.PluginManager~_getManagerStoragePath
	 *
	 * @returns {string} The path to load from/store to
	 */
	private _getManagerStoragePath ():string {
		return path.join(this._config.get('app.dataPath'), 'pluginManager.json');
	}

	/**
	 * Loads the plugin state from a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManager~_loadPluginState
	 */
	private _loadPluginState (callback:(err:Error, pluginState:any) => void):void {
		//console.log('loading the plugin state from the preferences!');

		fs.readJson(this._getManagerStoragePath(), (err:Error, data:Object) => {

			if (err) {
				// check for syntax errors
				console.log(err);
			}
			else {
				if (data.hasOwnProperty('plugins')) {
					var pluginState:PluginStateInterface = <PluginStateInterface> data['plugins'];
					var types:Array<string> = Object.keys(pluginState);

					for (var i in types) {
						var type:string = types[i];
						var typedPlugins:PluginStateObjectListInterface = pluginState[type];

						for (var j in typedPlugins) {
							this._processLoadedPlugin(type, typedPlugins[j]);

							// skdlf
						}
					}
				}
				else {
					console.log('no plugins key found!');
				}
			}

			callback(null, null);
		});
	}

	private _processLoadedPlugin (type:string, plugin:PluginStateObjectInterface):void {
		if (type === 'active') {

		}
		else if (type === 'idle') {

		}
		else if (type === 'inactive') {

		}
	}

	/**
	 * Saves the plugin state to a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManagerInterface#savePluginState
	 */
	private _savePluginState (callback:(err:Error) => void):void {
		//console.log('saving the plugin state to the preferences!');

		//console.log('writing json to:');
		fs.writeJson(this._getManagerStoragePath() + '_', this._pluginState, function (err:Error) {
			//console.log('written...');
			callback(err);
		});
	}

}

export = PluginManager;