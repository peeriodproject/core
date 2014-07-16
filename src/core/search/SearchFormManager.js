/// <reference path='../../main.d.ts' />
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchFormManager
* @implements core.search.SearchFormManagerInterface
*/
var SearchFormManager = (function () {
    function SearchFormManager(config, appQuitHandler, stateHandlerFactory, pluginManager, searchRequestManager, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        this._config = null;
        this._currentFormIdentifier = null;
        this._isOpen = false;
        this._pluginManager = null;
        this._stateHandler = null;
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
            appQuitHandler.add(function () {
                _this.close(_this._options.onCloseCallback);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    SearchFormManager.prototype.addQuery = function (rawQuery, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._pluginManager.getActivePluginRunner(this._currentFormIdentifier, function (pluginRunner) {
            pluginRunner.getQuery(rawQuery, function (err, query) {
                if (err) {
                    console.log(err);
                    return internalCallback(err);
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

        this._stateHandler.save({ currentForm: this._currentFormIdentifier }, function (err) {
            if (err) {
                return internalCallback(err);
            }

            _this._isOpen = false;

            return internalCallback(null);
        });
    };

    SearchFormManager.prototype.getFormIdentifiers = function (callback) {
        this._pluginManager.getActivePluginRunnerIdentifiers(callback);
    };

    SearchFormManager.prototype.getCurrentFormIdentifier = function (callback) {
        return process.nextTick(callback.bind(null, this._currentFormIdentifier));
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

        this.getFormIdentifiers(function (identifiers) {
            var err = _this._setForm(identifiers, identifier);

            return internalCallback(err);
        });
    };

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
