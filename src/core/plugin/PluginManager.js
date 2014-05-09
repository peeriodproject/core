/// <reference path='../../main.d.ts' />
var fs = require('fs-extra');
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.plugin.PluginManager
* @implements PluginManagerInterface
*/
var PluginManager = (function () {
    function PluginManager(config, pluginFinder, options) {
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
        /**
        * Represents the state of activated, deactivated and idle plugins
        *
        * @member {core.plugin.PluginStateInterface} core.plugin.PluginManager~_pluginState
        */
        this._pluginState = null;
        var defaults = {
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;
        this._pluginFinder = pluginFinder;
        this._options = ObjectUtils.extend(defaults, options);

        this.open(this._options.onOpenCallback);
    }
    /*public checkPluginFolderForNewPlugins(callback:(err:Error, pluginPaths:PluginPathListInterface) => void):void {
    
    }*/
    PluginManager.prototype.close = function (callback) {
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return internalCallback(null);
        }

        this._savePluginState(function (err) {
            if (err) {
                internalCallback(err);
            } else {
                this._isOpen = false;
                internalCallback(null);
            }
        });
    };

    PluginManager.prototype.findNewPlugins = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._pluginFinder.findPlugins(internalCallback);
    };

    // todo his method is copied from RoutingTable! we should have a simple Closable-Class!!!
    PluginManager.prototype.isOpen = function (callback) {
        return callback(null, this._isOpen);
    };

    PluginManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (this._isOpen) {
            return internalCallback(null);
        }

        // todo add callback and move isOpen to the callback
        this._loadPluginState(function (err, pluginState) {
            if (err) {
                internalCallback(err);
            } else {
                //console.log('got the plugin state. do something with it!');
                // this._pluginState = pluginState
                _this._isOpen = true;
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
        var _this = this;
        fs.readJson(this._getManagerStoragePath(), function (err, data) {
            if (err) {
                // check for syntax errors
                console.log(err);
            } else {
                if (data.hasOwnProperty('plugins')) {
                    var pluginState = data['plugins'];
                    var types = Object.keys(pluginState);

                    for (var i in types) {
                        var type = types[i];
                        var typedPlugins = pluginState[type];

                        for (var j in typedPlugins) {
                            _this._processLoadedPlugin(type, typedPlugins[j]);
                            // skdlf
                        }
                    }
                } else {
                    console.log('no plugins key found!');
                }
            }

            callback(null, null);
        });
    };

    PluginManager.prototype._processLoadedPlugin = function (type, plugin) {
        if (type === 'active') {
        } else if (type === 'idle') {
        } else if (type === 'inactive') {
        }
    };

    /**
    * Saves the plugin state to a persistant storage
    *
    * todo define pluginState
    *
    * @method core.plugin.PluginManagerInterface#savePluginState
    */
    PluginManager.prototype._savePluginState = function (callback) {
        //console.log('saving the plugin state to the preferences!');
        //console.log('writing json to:');
        fs.writeJson(this._getManagerStoragePath() + '_', this._pluginState, function (err) {
            //console.log('written...');
            callback(err);
        });
    };
    return PluginManager;
})();

module.exports = PluginManager;
//# sourceMappingURL=PluginManager.js.map
