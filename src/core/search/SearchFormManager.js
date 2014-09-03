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
        * A flag indicates whether the manager is open or closed
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

        var statePath = path.resolve(config.get('app.dataPath'), config.get('search.searchFormStateConfig'));
        var fallbackStatePath = path.resolve(config.get('app.internalDataPath'), config.get('search.searchFormStateConfig'));

        this._config = config;
        this._stateHandler = stateHandlerFactory.create(statePath, fallbackStatePath);
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
            if (!pluginRunner) {
                return process.nextTick(internalCallback.bind(null, new Error('SearchFormManager#addQuery: No active pluginRunner for "' + _this._currentFormIdentifier + '"found.'), null));
            }

            pluginRunner.getQuery(rawQuery, function (err, query) {
                if (err) {
                    return internalCallback(err, null);
                } else if (!query) {
                    // todo return error if the query is invalid
                    return internalCallback(new Error('SearchFormManager#addQuery: Invalid query!'), null);
                }

                _this._pluginManager.getPluginSettings(_this._currentFormIdentifier, function (settings) {
                    // todo HERE! update query here and add filename if the plugin enabled it
                    if (!settings || settings['addItemNameToSearchQueries'] !== false) {
                        var transformedQuery = {
                            query: {
                                bool: {
                                    should: [
                                        {
                                            match_phrase: {
                                                itemName: {
                                                    boost: 2,
                                                    query: rawQuery,
                                                    analyzer: 'itemname_index'
                                                }
                                            }
                                        },
                                        {
                                            match: {
                                                itemName: rawQuery
                                            }
                                        }
                                    ]
                                }
                            },
                            highlight: {
                                fields: {
                                    itemName: {}
                                }
                            }
                        };

                        // attach plugin query
                        if (query.query) {
                            transformedQuery.query.bool.should.push(query.query);
                        }

                        // attach plugin highlights
                        if (query.highlight && query.highlight.fields) {
                            var fields = Object.keys(query.highlight.fields);

                            for (var i = 0, l = fields.length; i < l; i++) {
                                var field = fields[i];

                                if (!transformedQuery.highlight.fields[field]) {
                                    transformedQuery.highlight.fields[field] = query.highlight.fields[field];
                                }
                            }
                        }

                        query = transformedQuery;
                    }

                    return _this._searchRequestManager.addQuery(query, internalCallback);
                });
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

                        // file not found. starting from a fresh state
                        if (err && err.message.indexOf('Cannot find state file') !== -1) {
                            err = null;
                        }
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
