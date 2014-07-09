/// <reference path='../../main.d.ts' />

import events = require('events');
import fs = require('fs-extra');
import path = require('path');

import mime = require('mime');

import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginFinderInterface = require('./interfaces/PluginFinderInterface');
import PluginInterface = require('./interfaces/PluginInterface');
import PluginManagerInterface = require('./interfaces/PluginManagerInterface');
import PluginLoaderFactoryInterface = require('./interfaces/PluginLoaderFactoryInterface');
import PluginLoaderInterface = require('./interfaces/PluginLoaderInterface');
import PluginLoaderMapInterface = require('./interfaces/PluginLoaderMapInterface');
import PluginPathListInterface = require('./interfaces/PluginPathListInterface');
import PluginRunnerFactoryInterface = require('./interfaces/PluginRunnerFactoryInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');
import PluginRunnerMapInterface = require('./interfaces/PluginRunnerMapInterface');
import PluginStateInterface = require('./interfaces/PluginStateInterface');
import PluginStateObjectInterface = require('./interfaces/PluginStateObjectInterface');
import PluginStateObjectListInterface = require('./interfaces/PluginStateObjectListInterface');
import PluginValidatorInterface = require('./interfaces/PluginValidatorInterface');

import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * PluginManagerInterface implementation
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
class PluginManager implements PluginManagerInterface {

	/**
	 * The internally used config object instance
	 *
	 * @member {core.config.ConfigInterface} core.plugin.PluginManager~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * Emits the following events
	 *
	 * - pluginAdded
	 * - pluginRemoved
	 *
	 * @member {events.EventEmitter} core.plugin.PluginManager~_eventEmitter
	 */
	private _eventEmitter:events.EventEmitter = null;

	/**
	 * A flag indicates weather the store is open or closed
	 *
	 * @member {boolean} core.plugin.PluginManager~_isOpen
	 */
	private _isOpen:boolean = false;

	/**
	 * todo specify object type in docs
	 *
	 * @member {Object} core.plugin.PluginManager~_mimeTypeMap
	 */
	private _mimeTypeMap:{ [mimeType:string]:Array<string>; } = {};

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
	 * @member {core.plugin.PluginLoaderFactoryInterface} core.plugin.PluginManager~_pluginLoaderFactory
	 */
	private _pluginLoaderFactory:PluginLoaderFactoryInterface = null;

	/**
	 *
	 * @member {core.plugin.PluginLoadersListInterface} core.plugin.PluginManager~_pluginLoaders
	 */
	private _pluginLoaders:PluginLoaderMapInterface = {};

	/**
	 * The internally used {@link core.plugin.PluginRunnerFactoryInterface} instance
	 *
	 * @member {core.plugin.PluginRunnerFactoryInterface} core.plugin.PluginManager~_pluginRunnerFactory
	 */
	private _pluginRunnerFactory:PluginRunnerFactoryInterface = null;

	/**
	 * The list of (active) {@link core.plugin.PluginRunnerInterface}
	 *
	 * @member {core.plugin.PluginRunnerMapInterface} core.plugin.PluginManager~_pluginRunners
	 */
	private _pluginRunners:PluginRunnerMapInterface = {};

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
	 * @member {core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_pluginValidator
	 */
	private _pluginValidator:PluginValidatorInterface = null;

	constructor (config:ConfigInterface, pluginFinder:PluginFinderInterface, pluginValidator:PluginValidatorInterface, pluginLoaderFactory:PluginLoaderFactoryInterface, pluginRunnerFactory:PluginRunnerFactoryInterface, options:ClosableAsyncOptions = {}) {
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

		this._eventEmitter = new events.EventEmitter();

		this.open(this._options.onOpenCallback);
	}

	addEventListener (eventName:string, listener:Function) {
		this._eventEmitter.addListener(eventName, listener);
	}

	removeEventListener (eventName:string, listener:Function) {
		this._eventEmitter.removeListener(eventName, listener);
	}

	activatePluginState (callback?:(err:Error) => void):void {
		var internalCallback = callback || function (err:Error) {
		};

		if (this._pluginState && this._pluginState.active) {
			var plugins:PluginStateObjectListInterface = this._pluginState.active;
			var activated:number = 0;
			var errors:Array<Error> = [];

			for (var i = 0, l = plugins.length; i < l; i++) {
				this._activatePlugin(plugins[i], (err:Error) => {
					activated++;

					if (err) {
						errors.push(err);
					}

					if (activated === plugins.length) {
						// todo implement error callback!
						internalCallback(null);
						this._pluginStateIsActive = true;
					}
				});
			}
		}
		else {
			return process.nextTick(internalCallback.bind(null, null));
		}
	}

	public close (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onCloseCallback;

		if (!this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
		}

		this._savePluginState((err:Error) => {
			if (err) {
				internalCallback(err);
			}
			else {
				this._isOpen = false;

				for (var key in this._pluginRunners) {
					this._pluginRunners[key].cleanup();
				}

				//if (this._eventEmitter) {
				this._eventEmitter.removeAllListeners();
				//}
				this._eventEmitter = null;

				this._pluginLoaders = null;
				this._pluginRunners = null;

				internalCallback(null);
			}
		});

	}

	public findNewPlugins (callback?:(err:Error, pluginPaths:PluginPathListInterface) => void):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._pluginFinder.findPlugins(internalCallback);
	}

	public getActivePluginRunners (callback:(pluginRunners:PluginRunnerMapInterface) => void):void {
		return process.nextTick(callback.bind(null, this._pluginRunners));
	}

	public getActivePluginRunner (identifier:string, callback:(pluginRunner:PluginRunnerInterface) => void):void {
		var runner:PluginRunnerInterface = this._pluginRunners[identifier] ? this._pluginRunners[identifier] : null;

		return process.nextTick(callback.bind(null, runner));

	}

	// todo check file extension
	public getPluginRunnersForItem (itemPath:string, callback:(pluginRunners:PluginRunnerMapInterface) => void):void {
		var mimeType = this._getMimeType(itemPath);
		var responsibleRunners:PluginRunnerMapInterface = {};
		// todo replace array<string> with PluginIdentifierListInterface
		var map:Array<string> = this._mimeTypeMap[mimeType];

		if (map && map.length) {
			for (var i = 0, l = map.length; i < l; i++) {
				var key:string = map[i];

				responsibleRunners[key] = this._pluginRunners[key];
			}
		}

		return process.nextTick(callback.bind(null, responsibleRunners));
	}

	public getPluginState (callback:(pluginState:PluginStateInterface) => void):void {
		return process.nextTick(callback.bind(null, this._pluginState));
	}

	// todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public onBeforeItemAdd (itemPath:string, stats:fs.Stats, fileHash:string, callback:(pluginDatas:Object) => any):void {
		logger.debug('on before item add:', itemPath);
		this.getPluginRunnersForItem(itemPath, (runners:PluginRunnerMapInterface) => {
			var runnersLength:number = Object.keys(runners).length;
			var counter:number = 0;
			var useApacheTika:Array<string> = [];
			var mergedPluginData = {};
			var sendCallback:Function = function () {
				// trigger callback
				callback(mergedPluginData);
			};
			var checkAndSendCallback:Function = function () {
				if (counter == runnersLength) {
					sendCallback();
				}
			};
			var runPlugins:Function = (tikaGlobals) => {
				if (runnersLength) {
					this._loadGlobals(itemPath, fileHash, (err:Error, globals:Object) => {
						if (err) {
							console.log(err);
							return sendCallback();
						}

						globals = ObjectUtils.extend(globals, tikaGlobals);

						for (var key in runners) {
							// call the plugin!
							runners[key].onBeforeItemAdd(itemPath, stats, globals, (err:Error, data:Object) => {
								counter++;

								if (err) {
									console.log(err);
								}
								else if (data) {
									mergedPluginData[key] = data;
								}

								checkAndSendCallback();
							});
						}
					});
				}
				else {
					sendCallback();
				}
			};

			// collect runners which depend on apache tika
			for (var key in runners) {
				var pluginLoader:PluginLoaderInterface = this._pluginLoaders[key];
				var settings:any = pluginLoader.getSettings();

				if (settings.useApacheTika) {
					useApacheTika.push(key);
				}

			}

			if (useApacheTika.length) {
				this._loadApacheTikaGlobals(itemPath, (err:Error, tikaGlobals) => {
					if (err) {
						console.log('PluginManager.onBeforeItemAdd. MISSING CALLBACK');
						console.error(err);
					}
					else {
						runPlugins(tikaGlobals);
					}
				});
			}
			else {
				runPlugins(null);
			}
		});
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
			//return internalCallback(null);
		}

		this._loadPluginState((err:Error, pluginState:any) => {
			if (err) {
				console.log(err);
				internalCallback(err);
			}
			else {
				if (!this._eventEmitter) {
					this._eventEmitter = new events.EventEmitter();
				}

				this._pluginState = pluginState;
				this._isOpen = true;

				internalCallback(null);
			}
		});
	}

	/**
	 * The PluginManager is going to activate the plugin. But before we're going to run thirdparty code within
	 * the app we validate the plugin using a {@link core.plugin.PluginValidatorInterface}.
	 *
	 * @member {core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_activatePlugin
	 *
	 * @param {core.plugin.PluginStateObjectInterface} pluginState
	 * @param {Function} callback
	 */
	private _activatePlugin (pluginState:PluginStateObjectInterface, callback:(err:Error) => void):void {
		var internalCallback = callback || function (err:Error) {
		};

		this._pluginValidator.validateState(pluginState, (err:Error) => {
			var identifier:string = pluginState.name;

			if (err) {
				return internalCallback(err);
			}
			else {
				// register plugin to mime type list
				// todo create extensions list
				var pluginLoader:PluginLoaderInterface = this._pluginLoaderFactory.create(this._config, pluginState.path);
				var mimeTypes:Array<string> = pluginLoader.getFileMimeTypes();

				if (mimeTypes.length) {
					for (var i = 0, l = mimeTypes.length; i < l; i++) {
						var mimeType:string = mimeTypes[i];

						if (!this._mimeTypeMap[mimeType]) {
							this._mimeTypeMap[mimeType] = [identifier];
						}
						else {
							this._mimeTypeMap[mimeType].push(identifier);
						}
					}
				}

				this._pluginLoaders[identifier] = pluginLoader;
				this._pluginRunners[identifier] = this._pluginRunnerFactory.create(this._config, pluginState.name, pluginLoader.getMain());

				logger.debug('plugin added', { identifier: identifier });
				this._eventEmitter.emit('pluginAdded', identifier);

				internalCallback(null);
			}
		});
	}

	/**
	 * Returns the absolute path where the manager should load and store the plugin state
	 *
	 * @method core.plugin.PluginManager~_getManagerStoragePath
	 *
	 * @returns {string} The path to load from/store to
	 */
	private _getManagerStoragePath ():string {
		return path.resolve(this._config.get('app.dataPath'), 'pluginManager.json');
	}

	/**
	 * Returns the mimetype for the given path.
	 *
	 * @method core.plugin.PluginManager~_getMimeType
	 *
	 * @param {string} filePath
	 * @returns {string}
	 */
	private _getMimeType (filePath:string):string {
		return mime.lookup(filePath);
	}

	/*private _isResponsibleForMimeType (mimeType:string, pluginLoader:PluginLoaderInterface):boolean {
	 return (pluginLoader.getFileMimeTypes().indexOf(mimeType) !== 1) ? true : false;
	 }*/

	/**
	 * Loads the plugin state from a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManager~_loadPluginState
	 *
	 * @param {Function} callback
	 */
	private _loadPluginState (callback:(err:Error, pluginState:any) => void):void {
		//console.log('loading the plugin state from the preferences!');
		fs.readJson(this._getManagerStoragePath(), (err:Error, data:Object) => {
			var hasPlugins:boolean = data ? data.hasOwnProperty('plugins') : false;

			// no file or no plugins
			if (err && err.name === 'ENOENT' || !hasPlugins) {
				callback(null, null);
			}
			else if (hasPlugins) {
				callback(null, data['plugins']);
			}
			else {
				// check for syntax errors
				console.warn(err);
			}

			/*if (err) {

			 console.log(err);
			 if (err.code === 'ENOENT') {

			 }
			 }
			 else {
			 if (data.hasOwnProperty('plugins')) {
			 callback(null, data['plugins']);
			 }
			 else {
			 callback(null, null);
			 }
			 }*/
		});
	}

	/**
	 * Saves the plugin state to a persistant storage
	 *
	 * todo define pluginState
	 *
	 * @method core.plugin.PluginManagerInterface~_savePluginState
	 *
	 * @param {Function} callback
	 */
	private _savePluginState (callback:(err:Error) => void):void {
		var state = {
			plugins: this._pluginState
		};

		fs.writeJson(this._getManagerStoragePath(), state, function (err:Error) {
			callback(err);
		});
	}

	/**
	 * Loads additional data for the specified path that are required for a plugin that uses `Apache Tika`.
	 *
	 * @method core.plugin.PluginManagerInterface~_loadApacheTikaGlobals
	 *
	 * @param {string} itemPath
	 * @param {Function} callback
	 */
	private _loadApacheTikaGlobals (itemPath:string, callback:Function):void {
		var tikaGlobals = {
		};

		fs.stat(itemPath, function (err:Error, stats:fs.Stats) {
			if (err) {
				return callback(err, tikaGlobals);
			}
			else if (stats.isFile()) {
				fs.readFile(itemPath, function (err:Error, data:Buffer) {
					if (err) {
						return callback(err, null);
					}
					else {
						tikaGlobals['fileBuffer'] = data.toString('base64');
						return callback(null, tikaGlobals);
					}
				})
			}
		});
		//callback(null, tikaGlobals);
	}

	/**
	 * Loads the default globals used by every plugin type.
	 *
	 * @method core.plugin.PluginManagerInterface~_loadGlobals
	 *
	 * @param {string} itemPath
	 * @param {string} fileHash
	 * @param {Function} callback
	 */
	private _loadGlobals (itemPath:string, fileHash:string, callback:(err:Error, globals:Object) => any):void {
		var globals = {
			fileBuffer: null,
			fileHash  : fileHash
		};

		callback(null, globals);
	}

}

export = PluginManager;