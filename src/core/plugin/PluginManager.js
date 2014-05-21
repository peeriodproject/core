/// <reference path='../../main.d.ts' />
var fs = require('fs-extra');
var path = require('path');

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
        * A flag indicates weather the store is open or closed
        *
        * @member {boolean} core.plugin.PluginManager~_isOpen
        */
        this._isOpen = false;
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
        this._pluginLoaderFactory = null;
        this._pluginLoaders = {};
        /**
        *
        * @member {core.plugin.PluginRunnerInterface} core.plugin.PluginManager~_pluginRunner
        */
        this._pluginRunnerFactory = null;
        /**
        *
        * @member core.plugin.PluginManager~_pluginRunners
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
        * @member (core.plugin.PluginValidatorInterface} core.plugin.PluginManager~_pluginValidator
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

        this.open(this._options.onOpenCallback);
    }
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

    // todo clean up _pluginRunners[].cleanup()
    PluginManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        for (var key in this._pluginRunners) {
            this._pluginRunners[key].cleanup();
        }

        this._pluginLoaders = null;
        this._pluginLoaders = null;

        this._savePluginState(function (err) {
            if (err) {
                internalCallback(err);
            } else {
                _this._isOpen = false;
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

    PluginManager.prototype.getPluginState = function (callback) {
        return process.nextTick(callback.bind(null, this._pluginState));
    };

    // todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
    PluginManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    PluginManager.prototype.onBeforeItemAdd = function (itemPath, stats, callback) {
        this.getActivePluginRunners(function (runners) {
            var runnersLength = Object.keys(runners).length;
            var counter = 0;
            var testCallback = function () {
                if (counter == runnersLength - 1) {
                    // trigger callback
                    callback();
                }
            };

            for (var key in runners) {
                // call the plugin!
                runners[key].onBeforeItemAdd(itemPath, stats, function (err, data) {
                    counter++;

                    // todo parse data and merge them together
                    testCallback();
                });
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
                internalCallback(err);
            } else {
                _this._pluginState = pluginState;
                _this._isOpen = true;

                internalCallback(null);
            }
        });
    };

    /**
    * The PluginManager is going to activate the plugin. But before we're going to run thirdparty code within
    * the app we validate the code using a {@link core.plugin.PluginValidatorInterface}.
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
                _this._pluginLoaders[identifier] = _this._pluginLoaderFactory.create(_this._config, pluginState.path);

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
    return PluginManager;
})();

module.exports = PluginManager;
//# sourceMappingURL=PluginManager.js.map
