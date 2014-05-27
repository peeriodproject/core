/// <reference path='../../main.d.ts' />
var events = require('events');
var fs = require('fs-extra');
var path = require('path');

var mime = require('mime');

var ObjectUtils = require('../utils/ObjectUtils');

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
var PluginManager = (function () {
    function PluginManager(config, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, options) {
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
        */
        this._eventEmitter = null;
        /**
        * A flag indicates weather the store is open or closed
        *
        * @member {boolean} core.plugin.PluginManager~_isOpen
        */
        this._isOpen = false;
        /**
        *
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
        * @member {core.plugin.PluginRunnerListInterface} core.plugin.PluginManager~_pluginRunners
        */
        this._pluginRunners = {};
        /**
        * Represents the state of activated, deactivated and idle plugins
        *
        * @member {core.plugin.PluginStateInterface} core.plugin.PluginManager~_pluginState
        */
        this._pluginState = null;
        /**
        * Indicates weather the state is just loaded from the storage or already processed
        *
        * @member {boolean} core.plugin.PluginManager~_pluginStateIsActive
        */
        this._pluginStateIsActive = false;
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

        this._config = config;
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
        var internalCallback = callback || function (err) {
        };

        if (this._pluginState && this._pluginState.active) {
            var plugins = this._pluginState.active;
            var activated = 0;
            var errors = [];
            var manager = this;

            return (function activatePlugin(i) {
                if (i >= plugins.length) {
                    // callback
                    return;
                }

                manager._activatePlugin(plugins[i], function (err) {
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
    };

    PluginManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._savePluginState(function (err) {
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

    PluginManager.prototype.getActivePluginRunners = function (callback) {
        return process.nextTick(callback.bind(null, this._pluginRunners));
    };

    /**
    * @param {string} identifier
    * @returns {core.plugin.PluginRunnerInterface}
    */
    PluginManager.prototype.getActivePluginRunner = function (identifier, callback) {
        var runner = this._pluginRunners[identifier] ? this._pluginRunners[identifier] : null;

        return process.nextTick(callback.bind(null, runner));
    };

    // todo check file extension
    PluginManager.prototype.getPluginRunnersForItem = function (itemPath, callback) {
        var mimeType = this._getMimeType(itemPath);
        var responsibleRunners = {};

        // todo replace array<string> with PluginIdentifierListInterface
        var map = this._mimeTypeMap[mimeType];

        if (map && map.length) {
            for (var i in map) {
                var key = map[i];

                responsibleRunners[key] = this._pluginRunners[key];
            }
        }

        return process.nextTick(callback.bind(null, responsibleRunners));
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
                callback(mergedPluginData);
            };
            var checkAndSendCallback = function () {
                if (counter == runnersLength) {
                    sendCallback();
                }
            };
            var runPlugins = function (tikaGlobals) {
                if (runnersLength) {
                    _this._loadGlobals(itemPath, fileHash, function (err, globals) {
                        if (err) {
                            console.log(err);
                            return sendCallback();
                        }

                        globals = ObjectUtils.extend(globals, tikaGlobals);

                        for (var key in runners) {
                            // call the plugin!
                            runners[key].onBeforeItemAdd(itemPath, stats, globals, function (data) {
                                counter++;

                                mergedPluginData[key] = data;

                                checkAndSendCallback();
                            });
                        }
                        //console.log(JSON.stringify(mergedPluginData));
                    });
                } else {
                    sendCallback();
                }
            };

            for (var key in runners) {
                var pluginLoader = _this._pluginLoaders[key];
                var settings = pluginLoader.getSettings();

                if (settings.useApacheTika) {
                    useApacheTika.push(key);
                }
            }

            if (useApacheTika.length) {
                _this._loadApacheTikaGlobals(itemPath, function (err, tikaGlobals) {
                    if (err) {
                        console.log('PluginManager.onBeforeItemAdd. MISSING CALLBACK');
                        console.error(err);
                    } else {
                        runPlugins(tikaGlobals);
                    }
                });
            } else {
                runPlugins(null);
            }
        });
    };

    PluginManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
            //return internalCallback(null);
        }

        this._loadPluginState(function (err, pluginState) {
            if (err) {
                console.log(err);
                internalCallback(err);
            } else {
                if (!_this._eventEmitter) {
                    _this._eventEmitter = new events.EventEmitter();
                }

                _this._pluginState = pluginState;
                _this._isOpen = true;

                internalCallback(null);
            }
        });
    };

    /**
    * The PluginManager is going to activate the plugin. But before we're going to run thirdparty code within
    * the app we validate the plugin using a {@link core.plugin.PluginValidatorInterface}.
    *
    * todo deactivate plugin
    */
    PluginManager.prototype._activatePlugin = function (pluginState, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._pluginValidator.validateState(pluginState, function (err) {
            var identifier = pluginState.name;

            if (err) {
                return internalCallback(err);
            } else {
                _this._pluginRunners[identifier] = _this._pluginRunnerFactory.create(_this._config, pluginState.name, pluginState.path);

                // register plugin to mime type list
                // todo create extensions list
                var pluginLoader = _this._pluginLoaderFactory.create(_this._config, pluginState.path);
                var mimeTypes = pluginLoader.getFileMimeTypes();

                if (mimeTypes.length) {
                    for (var i in mimeTypes) {
                        var mimeType = mimeTypes[i];

                        if (!_this._mimeTypeMap[mimeType]) {
                            _this._mimeTypeMap[mimeType] = [identifier];
                        } else {
                            _this._mimeTypeMap[mimeType].push(identifier);
                        }
                    }
                }

                _this._pluginLoaders[identifier] = pluginLoader;

                _this._eventEmitter.emit('pluginAdded', identifier);

                internalCallback(null);
            }
        });
    };

    /**
    * Returns the path where the manager should load/store the plugin state
    *
    * @method core.plugin.PluginManager~_getManagerStoragePath
    *
    * @returns {string} The path to load from/store to
    */
    PluginManager.prototype._getManagerStoragePath = function () {
        return path.join(this._config.get('app.dataPath'), 'pluginManager.json');
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
    * Loads the plugin state from a persistant storage
    *
    * todo define pluginState
    *
    * @method core.plugin.PluginManager~_loadPluginState
    */
    PluginManager.prototype._loadPluginState = function (callback) {
        //console.log('loading the plugin state from the preferences!');
        fs.readJson(this._getManagerStoragePath(), function (err, data) {
            if (err) {
                // check for syntax errors
                console.log(err);
            } else {
                if (data.hasOwnProperty('plugins')) {
                    callback(null, data['plugins']);
                } else {
                    callback(null, null);
                }
            }
        });
    };

    /**
    * Saves the plugin state to a persistant storage
    *
    * todo define pluginState
    *
    * @method core.plugin.PluginManagerInterface#savePluginState
    */
    PluginManager.prototype._savePluginState = function (callback) {
        var state = {
            plugins: this._pluginState
        };

        fs.writeJson(this._getManagerStoragePath(), state, function (err) {
            callback(err);
        });
    };

    PluginManager.prototype._loadApacheTikaGlobals = function (itemPath, callback) {
        var tikaGlobals = {};

        callback(null, tikaGlobals);
    };

    PluginManager.prototype._loadGlobals = function (itemPath, fileHash, callback) {
        var globals = {
            fileBuffer: null,
            fileHash: fileHash
        };

        fs.stat(itemPath, function (err, stats) {
            if (err) {
                return callback(err, null);
            } else if (stats.isFile()) {
                fs.readFile(itemPath, function (err, data) {
                    if (err) {
                        return callback(err, null);
                    } else {
                        globals['fileBuffer'] = data;
                        return callback(null, globals);
                    }
                });
            }
        });
    };
    return PluginManager;
})();

module.exports = PluginManager;
//# sourceMappingURL=PluginManager.js.map
