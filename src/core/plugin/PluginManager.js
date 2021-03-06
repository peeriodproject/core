/// <reference path='../../main.d.ts' />
var events = require('events');
var fs = require('fs-extra');
var path = require('path');

var mime = require('mime');

var ObjectUtils = require('../utils/ObjectUtils');

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
var PluginManager = (function () {
    function PluginManager(config, stateHandlerFactory, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, options) {
        if (typeof options === "undefined") { options = {}; }
        /**
        * The internally used config object instance
        *
        * @member {core.config.ConfigInterface} core.plugin.PluginManager~_config
        */
        this._config = null;
        /**
        * Emits the following events
        *
        * - pluginAdded
        * - pluginRemoved
        *
        * @member {events.EventEmitter} core.plugin.PluginManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * A flag indicates whether the store is open or closed
        *
        * @member {boolean} core.plugin.PluginManager~_isOpen
        */
        this._isOpen = false;
        /**
        * todo specify object type in docs
        *
        * @member {Object} core.plugin.PluginManager~_mimeTypeMap
        */
        this._mimeTypeMap = {};
        /**
        *
        * @member {core.utils.ClosableAsyncOptions} core.plugin.PluginManager~_options
        */
        this._options = {};
        /**
        * The internally used plugin finder instance
        *
        * @member {core.config.ConfigInterface} core.plugin.PluginManager~_pluginFinder
        */
        this._pluginFinder = null;
        /**
        * @member {core.plugin.PluginLoaderFactoryInterface} core.plugin.PluginManager~_pluginLoaderFactory
        */
        this._pluginLoaderFactory = null;
        /**
        *
        * @member {core.plugin.PluginLoadersListInterface} core.plugin.PluginManager~_pluginLoaders
        */
        this._pluginLoaders = {};
        /**
        * The internally used {@link core.plugin.PluginRunnerFactoryInterface} instance
        *
        * @member {core.plugin.PluginRunnerFactoryInterface} core.plugin.PluginManager~_pluginRunnerFactory
        */
        this._pluginRunnerFactory = null;
        /**
        * The list of (active) {@link core.plugin.PluginRunnerInterface}
        *
        * @member {core.plugin.PluginRunnerMapInterface} core.plugin.PluginManager~_pluginRunners
        */
        this._pluginRunners = {};
        /**
        * Represents the state of activated, deactivated and idle plugins
        *
        * @member {core.plugin.PluginStateInterface} core.plugin.PluginManager~_pluginState
        */
        this._pluginState = null;
        /**
        * Indicates whether the state is just loaded from the storage or already processed
        *
        * @member {boolean} core.plugin.PluginManager~_pluginStateIsActive
        */
        this._pluginStateIsActive = false;
        /**
        * The StateHandler instance that is used to store the plugin state
        *
        * @member {core.utils.StateHandlerInterface} core.plugin.PluginManager~_stateHandler
        */
        this._stateHandler = null;
        /**
        * @member {core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_pluginValidator
        */
        this._pluginValidator = null;
        var defaults = {
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        var statePath = path.join(config.get('app.dataPath'), config.get('plugin.pluginManagerStateConfig'));
        var fallbackStatePath = path.join(config.get('app.internalDataPath'), config.get('plugin.pluginManagerStateConfig'));

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
    PluginManager.prototype.addEventListener = function (eventName, listener) {
        this._eventEmitter.addListener(eventName, listener);
    };

    PluginManager.prototype.removeEventListener = function (eventName, listener) {
        this._eventEmitter.removeListener(eventName, listener);
    };

    PluginManager.prototype.activatePluginState = function (callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        if (this._pluginState && this._pluginState.active) {
            var plugins = this._pluginState.active;
            var activated = 0;
            var errors = [];

            for (var i = 0, l = plugins.length; i < l; i++) {
                this._activatePlugin(plugins[i], function (err) {
                    activated++;

                    if (err) {
                        errors.push(err);
                    }

                    if (activated === plugins.length) {
                        // todo implement error callback!
                        internalCallback(null);
                        _this._pluginStateIsActive = true;
                    }
                });
            }
        } else {
            return process.nextTick(internalCallback.bind(null, null));
        }
    };

    PluginManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._stateHandler.save(this._pluginState, function (err) {
            if (err) {
                internalCallback(err);
            } else {
                _this._isOpen = false;

                for (var key in _this._pluginRunners) {
                    _this._pluginRunners[key].cleanup();
                }

                //if (this._eventEmitter) {
                _this._eventEmitter.removeAllListeners();

                //}
                _this._eventEmitter = null;

                _this._pluginLoaders = null;
                _this._pluginRunners = null;

                internalCallback(null);
            }
        });
    };

    PluginManager.prototype.findNewPlugins = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._pluginFinder.findPlugins(internalCallback);
    };

    PluginManager.prototype.getActivePluginRunner = function (identifier, callback) {
        var runner = this._pluginRunners[identifier] ? this._pluginRunners[identifier] : null;

        return process.nextTick(callback.bind(null, runner));
    };

    PluginManager.prototype.getActivePluginRunnerIdentifiers = function (callback) {
        return process.nextTick(callback.bind(null, Object.keys(this._pluginRunners)));
    };

    PluginManager.prototype.getActivePluginRunners = function (callback) {
        return process.nextTick(callback.bind(null, this._pluginRunners));
    };

    // todo check file extension
    PluginManager.prototype.getPluginRunnersForItem = function (itemPath, callback) {
        var mimeType = this._getMimeType(itemPath);
        var responsibleRunners = {};

        // todo replace array<string> with PluginIdentifierListInterface
        var map = this._mimeTypeMap[mimeType];

        if (map && map.length) {
            for (var i = 0, l = map.length; i < l; i++) {
                var key = map[i];

                responsibleRunners[key] = this._pluginRunners[key];
            }
        }

        return process.nextTick(callback.bind(null, responsibleRunners));
    };

    PluginManager.prototype.getPluginSettings = function (identifier, callback) {
        var settings = this._pluginLoaders[identifier] ? this._pluginLoaders[identifier].getSettings() : null;

        return process.nextTick(callback.bind(null, settings));
    };

    PluginManager.prototype.getPluginState = function (callback) {
        return process.nextTick(callback.bind(null, this._pluginState));
    };

    // todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
    PluginManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    PluginManager.prototype.onBeforeItemAdd = function (itemPath, stats, fileHash, callback) {
        var _this = this;
        this.getPluginRunnersForItem(itemPath, function (runners) {
            var runnersLength = Object.keys(runners).length;
            var counter = 0;
            var useApacheTika = [];
            var mergedPluginData = {};
            var sendCallback = function () {
                // trigger callback
                return callback(mergedPluginData);
            };
            var checkAndSendCallback = function () {
                if (counter === runnersLength) {
                    return sendCallback();
                }
            };
            var runPlugins = function (tikaData) {
                if (!runnersLength) {
                    return sendCallback();
                }

                _this._loadGlobals(itemPath, fileHash, function (err, globals) {
                    if (err) {
                        return sendCallback();
                    }

                    for (var key in runners) {
                        // call the plugin!
                        runners[key].onBeforeItemAdd(itemPath, stats, globals, function (err, data) {
                            data = data || {};

                            counter++;

                            if (err) {
                                logger.error(err.message);
                            } else if (data) {
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

            for (var key in runners) {
                var pluginLoader = _this._pluginLoaders[key];
                var settings = pluginLoader.getSettings();

                if (settings.useApacheTika) {
                    useApacheTika.push(key);
                }
            }

            if (!useApacheTika.length) {
                return runPlugins(null);
            }

            _this._loadApacheTikaData(itemPath, function (err, tikaData) {
                if (err) {
                    logger.log('_loadApacheTikaData error!', err);

                    //return runPlugins(tikaData);
                    return sendCallback(null);
                } else {
                    return runPlugins(tikaData);
                }
            });
        });
    };

    PluginManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
            //return internalCallback(null);
        }

        this._stateHandler.load(function (err, pluginState) {
            if (err) {
                return internalCallback(err);
            }

            if (!_this._eventEmitter) {
                _this._eventEmitter = new events.EventEmitter();
            }

            _this._pluginState = pluginState;

            _this._isOpen = true;

            return internalCallback(null);
        });
    };

    /**
    * The PluginManager is going to activate the plugin. But before we're going to run thirdparty code within
    * the app we're going to validate the plugin using a {@link core.plugin.PluginValidatorInterface}.
    *
    * @member {core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_activatePlugin
    *
    * @param {core.plugin.PluginStateObjectInterface} pluginState
    * @param {Function} callback
    */
    PluginManager.prototype._activatePlugin = function (pluginState, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._pluginValidator.validateState(pluginState, function (err) {
            var identifier = pluginState.name;

            if (err) {
                return internalCallback(err);
            }

            // register plugin to mime type list
            // todo create extensions list
            var pluginLoader = _this._pluginLoaderFactory.create(_this._config, pluginState.path);
            var mimeTypes = pluginLoader.getFileMimeTypes();

            if (mimeTypes.length) {
                for (var i = 0, l = mimeTypes.length; i < l; i++) {
                    var mimeType = mimeTypes[i];

                    if (!_this._mimeTypeMap[mimeType]) {
                        _this._mimeTypeMap[mimeType] = [identifier];
                    } else {
                        _this._mimeTypeMap[mimeType].push(identifier);
                    }
                }
            }

            _this._pluginLoaders[identifier] = pluginLoader;
            _this._pluginRunners[identifier] = _this._pluginRunnerFactory.create(_this._config, pluginState.name, pluginLoader.getMain());

            logger.debug('plugin added', { identifier: identifier });
            _this._eventEmitter.emit('pluginAdded', identifier);

            return internalCallback(null);
        });
    };

    /**
    * Returns the mimetype for the given path.
    *
    * @method core.plugin.PluginManager~_getMimeType
    *
    * @param {string} filePath
    * @returns {string}
    */
    PluginManager.prototype._getMimeType = function (filePath) {
        return mime.lookup(filePath);
    };

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
    PluginManager.prototype._loadApacheTikaData = function (itemPath, callback) {
        var maxFileBufferLength = this._config.get('plugin.pluginManagerMaxFileBufferInMegaBytes');
        var tikaData = {};

        fs.stat(itemPath, function (err, stats) {
            if (err) {
                return callback(err, tikaData);
            }

            if (!stats.isFile() || maxFileBufferLength < stats.size / 1048576) {
                logger.log('PluginManager~_loadApacheTikaData: file', itemPath, 'is not a file or does not fit into the maxFileBufferLength limit.', stats.size / 1048576, maxFileBufferLength, 'MB');

                return callback(null, {});
            } else {
                fs.readFile(itemPath, function (err, data) {
                    if (err) {
                        return callback(err, tikaData);
                    }

                    tikaData.file = data.toString('base64');

                    return callback(null, tikaData);
                });
            }
            // todo add possible folder globals handling here
        });
    };

    /**
    * Loads the default globals used by every plugin type.
    *
    * @method core.plugin.PluginManagerInterface~_loadGlobals
    *
    * @param {string} itemPath
    * @param {string} fileHash
    * @param {Function} callback
    */
    PluginManager.prototype._loadGlobals = function (itemPath, fileHash, callback) {
        var globals = {
            fileBuffer: null,
            fileHash: fileHash
        };

        return callback(null, globals);
    };
    return PluginManager;
})();

module.exports = PluginManager;
//# sourceMappingURL=PluginManager.js.map
