/// <reference path='../../main.d.ts' />
var path = require('path');

/**
* @class core.search.SearchFormManager
* @implements core.search.SearchFormManagerInterface
*/
var SearchFormManager = (function () {
    function SearchFormManager(config, stateHandlerFactory, pluginManager) {
        this._config = null;
        this._currentFormIdentifier = null;
        this._isOpen = false;
        this._pluginManager = null;
        this._stateHandler = null;
        this._config = config;
        this._stateHandler = stateHandlerFactory.create(path.join(this._config.get('app.dataPath'), this._config.get('search.searchFormStateConfig')));
        this._pluginManager = pluginManager;

        this.open();
    }
    SearchFormManager.prototype.addQuery = function (rawQuery, callback) {
        var internalCallback = callback || function (err) {
        };

        this._pluginManager.getActivePluginRunner(this._currentFormIdentifier, function (pluginRunner) {
            pluginRunner.getQuery(rawQuery, function (err, query) {
                console.log(err);

                if (err) {
                    return internalCallback(err);
                }

                console.log('sending query down the wire', query);

                return internalCallback(null);
            });
        });
    };

    SearchFormManager.prototype.close = function (callback) {
        var internalCallback = callback || function (err) {
        };

        this._stateHandler.save({ currentForm: this._currentFormIdentifier }, internalCallback);
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
        var internalCallback = callback || function (err) {
        };

        this._pluginManager.open(function (err) {
            if (err) {
                return internalCallback(err);
            }

            _this.getFormIdentifiers(function (identifiers) {
                if (!identifiers.length) {
                    return internalCallback(new Error('SearchFormManager#open: No identifiers to construct a search form found. Add a plugin or enable at least one.'));
                }

                _this._stateHandler.load(function (err, state) {
                    if (err || !state || !state['currentForm'] || (identifiers.indexOf(state['currentForm']) === -1)) {
                        _this._currentFormIdentifier = identifiers[0];
                    }

                    _this._isOpen = true;

                    return internalCallback(null);
                });
            });
        });
    };

    SearchFormManager.prototype.setForm = function (identifier, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        this._pluginManager.getActivePluginRunnerIdentifiers(function (identifiers) {
            if (identifiers.indexOf(identifier) === -1) {
                return internalCallback(new Error('SearchFormManager#setForm: Could not activate the given identifier. The Idenifier is invalid'));
            }

            _this._currentFormIdentifier = identifier;
        });
    };
    return SearchFormManager;
})();

module.exports = SearchFormManager;
//# sourceMappingURL=SearchFormManager.js.map
