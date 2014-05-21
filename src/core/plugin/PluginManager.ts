/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');
import path = require('path');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginFinderInterface = require('./interfaces/PluginFinderInterface');
import PluginInterface = require('./interfaces/PluginInterface');
import PluginManagerInterface = require('./interfaces/PluginManagerInterface');
import PluginLoaderFactoryInterface = require('./interfaces/PluginLoaderFactoryInterface');
import PluginLoaderInterface = require('./interfaces/PluginLoaderInterface');
import PluginLoaderListInterface = require('./interfaces/PluginLoaderListInterface');
import PluginRunnerFactoryInterface = require('./interfaces/PluginRunnerFactoryInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');
import PluginRunnerListInterface = require('./interfaces/PluginRunnerListInterface');
import PluginStateInterface = require('./interfaces/PluginStateInterface');
import PluginStateObjectInterface = require('./interfaces/PluginStateObjectInterface');
import PluginStateObjectListInterface = require('./interfaces/PluginStateObjectListInterface');
import PluginValidatorInterface = require('./interfaces/PluginValidatorInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * todo implement StateHandler!
 *
 * @class core.plugin.PluginManager
 * @implements PluginManagerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.plugin.PluginFinderInterface} pluginFinder
 * @param {core.plugin.PluginValidatorInterface} pluginValidator
 * @param {core.plugin.PluginRunnerFactoryInterface} pluginRunnerFactory
 * @param {core.utils.ClosableAsyncOptions} options (optional)
 */
class PluginManager implements PluginManagerInterface, PluginInterface {

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


	private _pluginLoaderFactory:PluginLoaderFactoryInterface = null;

	private _pluginLoaders:PluginLoaderListInterface = {};

	/**
	 *
	 * @member {core.plugin.PluginRunnerInterface} core.plugin.PluginManager~_pluginRunner
	 */
	private _pluginRunnerFactory:PluginRunnerFactoryInterface = null;

	/**
	 *
	 * @member core.plugin.PluginManager~_pluginRunners
	 */
	private _pluginRunners:PluginRunnerListInterface  = {};

	/**
	 * Represents the state of activated, deactivated and idle plugins
	 *
	 * @member {core.plugin.PluginStateInterface} core.plugin.PluginManager~_pluginState
	 */
	private _pluginState:PluginStateInterface = null;

	/**
	 * Indicates weather the state is just loaded from the storage or already processed
	 *
	 * @member {boolean} core.plugin.PluginManager~_pluginStateIsActive
	 */
	private _pluginStateIsActive:boolean = false;

	/**
	 * @member (core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_pluginValidator
	 */
	private _pluginValidator:PluginValidatorInterface = null;

	constructor (config:ConfigInterface, pluginFinder:PluginFinderInterface, pluginValidator:PluginValidatorInterface, pluginLoaderFactory:PluginLoaderFactoryInterface , pluginRunnerFactory:PluginRunnerFactoryInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onCloseCallback: function (err:Error) {
			},
			onOpenCallback : function (err:Error) {
			}
		};

		this._config = config;
		this._pluginFinder = pluginFinder;
		this._pluginValidator = pluginValidator;
		this._pluginLoaderFactory = pluginLoaderFactory;
		this._pluginRunnerFactory = pluginRunnerFactory;
		this._options = ObjectUtils.extend(defaults, options);

		this.open(this._options.onOpenCallback);
	}

	activatePluginState (callback?:(err:Error) => void):void {
		var internalCallback = callback || function (err:Error) {};

		if (this._pluginState && this._pluginState.active) {
			var plugins:PluginStateObjectListInterface = this._pluginState.active;
			var activated:number = 0;
			var errors:Array<Error> = [];
			var manager = this;

			return (function activatePlugin (i) {
				if (i >= plugins.length) {
					// callback
					return;
				}

				manager._activatePlugin(plugins[i], function (err:Error) {
					activated++;

					if (err) {
						errors.push(err);
					}

					if (activated === plugins.length) {
						// todo implement error callback!
						internalCallback(null);
						manager._pluginStateIsActive = true;
					}
				});

				return process.nextTick(activatePlugin.bind(null, i + 1));
			}(0));
		}
	}

	// todo clean up _pluginRunners[].cleanup()
	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		/*if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}*/

		for (var key in this._pluginRunners) {
			this._pluginRunners[key].cleanup();
		}

		this._pluginLoaders = null;
		this._pluginLoaders = null;

		this._savePluginState((err:Error) => {
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
		var internalCallback = callback || function (err:Error) {
		};

		this._pluginFinder.findPlugins(internalCallback);
	}

	public getActivePluginRunners (callback:(pluginRunners:PluginRunnerListInterface) => void):void {
		return process.nextTick(callback.bind(null, this._pluginRunners));
	}

	/**
	 * @param {string} identifier
	 * @returns {core.plugin.PluginRunnerInterface}
	 */
	public getActivePluginRunner (identifier:string, callback:(pluginRunner:PluginRunnerInterface) => void):void {
		var runner:PluginRunnerInterface = this._pluginRunners[identifier] ? this._pluginRunners[identifier] : null;

		return process.nextTick(callback.bind(null, runner));

	}

	public getPluginState (callback:(pluginState:PluginStateInterface) => void):void {
		return process.nextTick(callback.bind(null, this._pluginState));
	}

	// todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public onBeforeItemAdd (itemPath:string, stats:fs.Stats, callback:Function):void {
		this.getActivePluginRunners((runners:PluginRunnerListInterface) => {
			var runnersLength = Object.keys(runners).length;
			var counter:number = 0;
			var testCallback:Function = function () {
				if (counter == runnersLength - 1) {
					// trigger callback
					callback();
				}
			};

			for (var key in runners) {
				// call the plugin!
				runners[key].onBeforeItemAdd(itemPath, stats, (err:Error, data:Object) => {
					counter++;

					// todo parse data and merge them together

					testCallback();
				});
			}
		});
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
			//return internalCallback(null);
		}

		this._loadPluginState((err:Error, pluginState:any) => {
			if (err) {
				internalCallback(err);
			}
			else {
				this._pluginState = pluginState;
				this._isOpen = true;

				internalCallback(null);
			}
		});
	}

	/**
	 * The PluginManager is going to activate the plugin. But before we're going to run thirdparty code within
	 * the app we validate the code using a {@link core.plugin.PluginValidatorInterface}.
	 */
	private _activatePlugin (pluginState:PluginStateObjectInterface, callback:(err:Error) => void):void {
		var internalCallback = callback || function (err:Error) {};

		this._pluginValidator.validateState(pluginState, (err:Error) => {
			var identifier:string = pluginState.name;

			if (err) {
				return internalCallback(err);
			}
			else {
				this._pluginRunners[identifier] = this._pluginRunnerFactory.create(this._config, pluginState.name, pluginState.path);
				this._pluginLoaders[identifier] = this._pluginLoaderFactory.create(this._config, pluginState.path);

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
					callback(null, data['plugins']);
				}
				else {
					callback(null, null);
				}
			}
		});
	}

	/**
	 * Saves the plugin state to a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManagerInterface#savePluginState
	 */
	private _savePluginState (callback:(err:Error) => void):void {
		var state = {
			plugins: this._pluginState
		};

		fs.writeJson(this._getManagerStoragePath(), state, function (err:Error) {
			callback(err);
		});
	}

}

export = PluginManager;