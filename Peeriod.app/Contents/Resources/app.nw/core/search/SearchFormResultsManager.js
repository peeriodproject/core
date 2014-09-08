var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var SearchFormManager = require('./SearchFormManager');

/**
* @class core.search.SearchFormResultsManager
* @implements core.search.SearchFormResultsManagerInterface
* @extends core.search.SearchFormManager
*/
var SearchFormResultsManager = (function (_super) {
    __extends(SearchFormResultsManager, _super);
    function SearchFormResultsManager(config, appQuitHandler, stateHandlerFactory, pluginManager, searchRequestManager, options) {
        if (typeof options === "undefined") { options = {}; }
        _super.call(this, config, appQuitHandler, stateHandlerFactory, pluginManager, searchRequestManager, options);
        /**
        * The internally uses PluginManagerInterface instance
        *
        * @member {core.plugin.PluginManagerInterface} core.search.SearchFormResultManager~_pluginManager
        */
        this.__pluginManager = null;
        this._pluginFieldsMap = {};
        /**
        * The internally used SearchRequestManagerInterface instance to start queries
        *
        * @member {core.search.SearchRequestManagerInterface} core.search.SearchFormResultManager~_searchRequestManager
        */
        this.__searchRequestManager = null;

        this.__pluginManager = pluginManager;
        this.__searchRequestManager = searchRequestManager;
    }
    SearchFormResultsManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        _super.prototype.open.call(this, function (err) {
            if (err) {
                //console.error(err.message);
                return internalCallback(err);
            }

            return _this._fetchAllPluginFields(internalCallback);
        });
    };

    SearchFormResultsManager.prototype.setForm = function (identifier, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        _super.prototype.setForm.call(this, identifier, function (err) {
            if (err) {
                return internalCallback(err);
            }

            return _this._fetchAllPluginFields(callback);
        });
    };

    // todo ts-definitions
    SearchFormResultsManager.prototype.transformResponses = function (responses, cleanupFields, callback) {
        var transformedResults = [];

        if (!responses || !responses.length) {
            return process.nextTick(callback.bind(null, null, []));
        }

        for (var i = 0, l = responses.length; i < l; i++) {
            var response = responses[i];
            var type = response._source ? response._source._type : '';
            var fields = this._pluginFieldsMap[type.toLowerCase()] || null;

            if (cleanupFields) {
                response = this._cleanupFields(response);
            }

            transformedResults.push({
                response: response,
                fields: fields
            });
        }

        return process.nextTick(callback.bind(null, null, transformedResults));
    };

    SearchFormResultsManager.prototype._cleanupFields = function (response) {
        delete response._index;
        delete response._type;
        delete response._source._meta;

        if (response.fields && response.fields._timestamp) {
            response._timestamp = response.fields._timestamp;

            delete response.fields._timestamp;

            if (!Object.keys(response.fields).length) {
                delete response.fields;
            }
        }

        return response;
    };

    SearchFormResultsManager.prototype._fetchAllPluginFields = function (callback) {
        var _this = this;
        this.__pluginManager.getActivePluginRunners(function (pluginRunners) {
            var identifiers = Object.keys(pluginRunners);
            var returned = 0;
            var checkAndCallback = function (err) {
                returned++;

                if (returned === identifiers.length || err) {
                    returned = -1;

                    return callback(err);
                }
            };

            if (!identifiers.length) {
                return callback(null);
            }

            for (var i = 0, l = identifiers.length; i < l; i++) {
                _this._fetchPluginFields(identifiers[i], pluginRunners[identifiers[i]], checkAndCallback);
            }
        });
    };

    SearchFormResultsManager.prototype._fetchPluginFields = function (identifier, pluginRunner, callback) {
        var _this = this;
        pluginRunner.getResultFields(function (err, fields) {
            if (err) {
                return callback(err);
            }

            _this._pluginFieldsMap[identifier.toLowerCase()] = fields;

            return callback(null);
        });
    };
    return SearchFormResultsManager;
})(SearchFormManager);

module.exports = SearchFormResultsManager;
//# sourceMappingURL=SearchFormResultsManager.js.map
