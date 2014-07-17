/// <reference path='../../main.d.ts' />
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchFormManager
* @implements core.search.SearchFormManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.utils.StateHandlerFactoryInterface} stateHandlerFactory
* @param {core.plugin.PluginManagerInterface} pluginManager
* @param {core.search.SearchRequestManagerInterface} searchRequestManager
* @param {core.utils.ClosableAsyncOptions} [options]
*/
var SearchFormManager = (function () {
    function SearchFormManager(config, appQuitHandler, stateHandlerFactory, pluginManager, searchRequestManager, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The internally used config instance
        *
        * @member {core.config.ConfigInterface} core.search.SearchFormManager~_config
        */
        this._config = null;
        /**
        * The identifier of the currently activated plugin to process incoming queries with.
        *
        * @member {string} core.search.SearchFormManager~_currentFormIdentifier
        */
        this._currentFormIdentifier = null;
        /**
        * A flag indicates weather the manager is open or closed
        *
        * @member {boolean} core.search.SearchFormManager~_isOpen
        */
        this._isOpen = false;
        /**
        * The internally uses PluginManagerInterface instance
        *
        * @member {core.plugin.PluginManagerInterface} core.search.SearchFormManager~_pluginManager
        */
        this._pluginManager = null;
        /**
        * The internally used StateHandlerInterface instance to load and save the current form state
        *
        * @member {core.utils.StateHandlerInterface} core.search.SearchFormManager~_stateHandler
        */
        this._stateHandler = null;
        /**
        * The internally used SearchRequestManagerInterface instance to start queries
        *
        * @member {core.search.SearchRequestManagerInterface} core.search.SearchFormManager~_searchRequestManager
        */
        this._searchRequestManager = null;
        this._options = {};
        var defaults = {
            closeOnProcessExit: true,
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;
        this._stateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('search.searchFormStateConfig')));
        this._pluginManager = pluginManager;
        this._searchRequestManager = searchRequestManager;

        this._options = ObjectUtils.extend(defaults, options);

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    SearchFormManager.prototype.addQuery = function (rawQuery, callback) {
        var _this = this;
        var internalCallback = callback || function (err, queryId) {
        };

        this._pluginManager.getActivePluginRunner(this._currentFormIdentifier, function (pluginRunner) {
            pluginRunner.getQuery(rawQuery, function (err, query) {
                if (err) {
                    console.log(err);
                    return internalCallback(err, null);
                }

                return _this._searchRequestManager.addQuery(query, internalCallback);
            });
        });
    };

    SearchFormManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this.getState(function (state) {
            _this._stateHandler.save(state, function (err) {
                if (err) {
                    return internalCallback(err);
                }

                _this._isOpen = false;

                return internalCallback(null);
            });
        });
    };

    SearchFormManager.prototype.getFormIdentifiers = function (callback) {
        this._pluginManager.getActivePluginRunnerIdentifiers(callback);
    };

    SearchFormManager.prototype.getCurrentFormIdentifier = function (callback) {
        return process.nextTick(callback.bind(null, this._currentFormIdentifier));
    };

    SearchFormManager.prototype.getState = function (callback) {
        return process.nextTick(callback.bind(null, {
            currentForm: this._currentFormIdentifier
        }));
    };

    SearchFormManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchFormManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._pluginManager.open(function (err) {
            if (err) {
                return internalCallback(err);
            }

            _this.getFormIdentifiers(function (identifiers) {
                if (!identifiers.length) {
                    return internalCallback(new Error('SearchFormManager#open: No identifiers to construct a search form found. Add a plugin or activate at least one.'));
                }

                _this._stateHandler.load(function (err, state) {
                    if (err || !state || !state['currentForm']) {
                        _this._currentFormIdentifier = identifiers[0];
                    } else {
                        err = _this._setForm(identifiers, state['currentForm']);
                    }

                    if (!err) {
                        _this._isOpen = true;
                    }

                    return internalCallback(err);
                });
            });
        });
    };

    SearchFormManager.prototype.setForm = function (identifier, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        if (identifier === this._currentFormIdentifier) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this.getFormIdentifiers(function (identifiers) {
            var err = _this._setForm(identifiers, identifier);

            return internalCallback(err);
        });
    };

    /**
    * Sets the given identifier as the new form processor and returns an error if the identifier is not available within the given identifiers list.
    *
    * @method core.search.SearchFormManager~_setForm
    *
    * todo ts-definition
    *
    * @param {Array} identifiers A list of all available identifiers
    * @param {string} identifier The identifier to activate
    * @returns {Error}
    */
    SearchFormManager.prototype._setForm = function (identifiers, identifier) {
        if (identifiers.indexOf(identifier) === -1) {
            return new Error('SearchFormManager#setForm: Could not activate the given identifier. The Identifier "' + identifier + '" is invalid');
        }

        this._currentFormIdentifier = identifier;

        return null;
    };
    return SearchFormManager;
})();

module.exports = SearchFormManager;
//# sourceMappingURL=SearchFormManager.js.map
