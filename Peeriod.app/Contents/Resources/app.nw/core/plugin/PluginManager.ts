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
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');

import ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * PluginManagerInterface implementation
 *
 * @class core.plugin.PluginManager
 * @implements PluginManagerInterface
 *
 * @param {core.config.ConfigInterface} config
 * @param {core.utils.StateHandlerInterface} stateHandler
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
	 * A flag indicates whether the store is open or closed
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
	 * Indicates whether the state is just loaded from the storage or already processed
	 *
	 * @member {boolean} core.plugin.PluginManager~_pluginStateIsActive
	 */
	private _pluginStateIsActive:boolean = false;

	/**
	 * The StateHandler instance that is used to store the plugin state
	 *
	 * @member {core.utils.StateHandlerInterface} core.plugin.PluginManager~_stateHandler
	 */
	private _stateHandler:StateHandlerInterface = null;

	/**
	 * @member {core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_pluginValidator
	 */
	private _pluginValidator:PluginValidatorInterface = null;

	constructor (config:ConfigInterface, stateHandlerFactory:StateHandlerFactoryInterface ,pluginFinder:PluginFinderInterface, pluginValidator:PluginValidatorInterface, pluginLoaderFactory:PluginLoaderFactoryInterface, pluginRunnerFactory:PluginRunnerFactoryInterface, options:ClosableAsyncOptions = {}) {
		var defaults:ClosableAsyncOptions = {
			onCloseCallback: function (err:Error) {
			},
			onOpenCallback : function (err:Error) {
			}
		};

		var statePath:string = path.join(config.get('app.dataPath'), config.get('plugin.pluginManagerStateConfig'));
		var fallbackStatePath:string = path.join(config.get('app.internalDataPath'), config.get('plugin.pluginManagerStateConfig'));

		logger.log('PluginManager state path ' + statePath);
		logger.log('PluginManager fallbackStatePath ' + fallbackStatePath);

		this._config = config;
		this._stateHandler = stateHandlerFactory.create(statePath, fallbackStatePath);
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

		this._stateHandler.save(this._pluginState, (err:Error) => {
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

	public getActivePluginRunner (identifier:string, callback:(pluginRunner:PluginRunnerInterface) => void):void {
		var runner:PluginRunnerInterface = this._pluginRunners[identifier] ? this._pluginRunners[identifier] : null;

		return process.nextTick(callback.bind(null, runner));
	}

	public getActivePluginRunnerIdentifiers (callback:(pluginRunnerIdentifiers:Array<string>) => any):void {
		return process.nextTick(callback.bind(null, Object.keys(this._pluginRunners)));
	}

	public getActivePluginRunners (callback:(pluginRunners:PluginRunnerMapInterface) => void):void {
		return process.nextTick(callback.bind(null, this._pluginRunners));
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

	public getPluginSettings (identifier:string, callback:(pluginSettings:Object) => void):void {
		var settings = this._pluginLoaders[identifier] ? this._pluginLoaders[identifier].getSettings() : null;

		return process.nextTick(callback.bind(null, settings));
	}

	public getPluginState (callback:(pluginState:PluginStateInterface) => void):void {
		return process.nextTick(callback.bind(null, this._pluginState));
	}

	// todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
	public isOpen (callback:(err:Error, isOpen:boolean) => any):void {
		return process.nextTick(callback.bind(null, null, this._isOpen));
	}

	public onBeforeItemAdd (itemPath:string, stats:fs.Stats, fileHash:string, callback:(pluginDatas:Object) => any):void {
		this.getPluginRunnersForItem(itemPath, (runners:PluginRunnerMapInterface) => {
			var runnersLength:number = Object.keys(runners).length;
			var counter:number = 0;
			var useApacheTika:Array<string> = [];
			var mergedPluginData = {};
			var sendCallback:Function = function () {
				// trigger callback
				return callback(mergedPluginData);
			};
			var checkAndSendCallback:Function = function () {
				if (counter === runnersLength) {
					return sendCallback();
				}
			};
			var runPlugins:Function = (tikaData) => {
				if (!runnersLength) {
					return sendCallback();
				}

				this._loadGlobals(itemPath, fileHash, (err:Error, globals:Object) => {
					if (err) {
						return sendCallback();
					}

					for (var key in runners) {
						// call the plugin!
						runners[key].onBeforeItemAdd(itemPath, stats, globals, (err:Error, data:Object) => {
							data = data || {};

							counter++;

							if (err) {
								logger.error(err.message);
							}
							else if (data) {
								if (useApacheTika.indexOf(key) !== -1) {
									data = ObjectUtils.extend(data, tikaData);
								}

								mergedPluginData[key] = data;
							}

							return checkAndSendCallback();
						});
					}
				});
			};

			// collect runners which depend on apache tika
			for (var key in runners) {
				var pluginLoader:PluginLoaderInterface = this._pluginLoaders[key];
				var settings:any = pluginLoader.getSettings();

				if (settings.useApacheTika) {
					useApacheTika.push(key);
				}

			}

			if (!useApacheTika.length) {
				return runPlugins(null);
			}

			this._loadApacheTikaData(itemPath, (err:Error, tikaData) => {
				if (err) {
					return sendCallback(null);
				}
				else {
					return runPlugins(tikaData);
				}
			});
		});
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || this._options.onOpenCallback;

		if (this._isOpen) {
			return process.nextTick(internalCallback.bind(null, null));
			//return internalCallback(null);
		}

		this._stateHandler.load((err:Error, pluginState:any) => {
			if (err) {
				return internalCallback(err);
			}

			if (!this._eventEmitter) {
				this._eventEmitter = new events.EventEmitter();
			}

			this._pluginState = pluginState;

			this._isOpen = true;

			return internalCallback(null);
		});
	}

	/**
	 * The PluginManager is going to activate the plugin. But before we're going to run thirdparty code within
	 * the app we're going to validate the plugin using a {@link core.plugin.PluginValidatorInterface}.
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

			return internalCallback(null);
		});
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
	 * Loads additional data for the specified path that are required for a plugin that uses `Apache Tika`.
	 *
	 * @method core.plugin.PluginManagerInterface~_loadApacheTikaData
	 *
	 * @param {string} itemPath
	 * @param {Function} callback
	 */
	private _loadApacheTikaData (itemPath:string, callback:Function):void {
		var maxFileBufferLength:number = this._config.get('plugin.pluginManagerMaxFileBufferInMegaBytes');
		var tikaData:any = {
		};

		fs.stat(itemPath, (err:Error, stats:fs.Stats) => {
			if (err) {

				return callback(err, tikaData);
			}

			if (!stats.isFile() || maxFileBufferLength <  stats.size / 1048576) {
				logger.log('PluginManager~_loadApacheTikaData: file', itemPath, 'is not a file or does not fit into the maxFileBufferLength limit.', stats.size / 1048576, maxFileBufferLength, 'MB');

				return callback(null, {});
			}
			else {
				fs.readFile(itemPath, function (err:Error, data:Buffer) {
					if (err) {
						return callback(err, tikaData);
					}

					tikaData.file = data.toString('base64');

					return callback(null, tikaData);
				});
			}

			// todo add possible folder globals handling here
		});
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

		return callback(null, globals);
	}

}

export = PluginManager;