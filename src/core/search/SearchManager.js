/// <reference path='../../../ts-definitions/node/node.d.ts' />
/**
* @class core.search.SearchManager
* @implements core.search.SearchManagerInterface
*/
var SearchManager = (function () {
    function SearchManager(config, pluginManager, searchClient) {
        this._config = null;
        this._isOpen = false;
        this._pluginManager = null;
        this._searchClient = null;
        this._config = config;
        this._pluginManager = pluginManager;
        this._searchClient = searchClient;

        this._registerPluginManagerEvents();
    }
    SearchManager.prototype.addItem = function (pathToIndex, stats, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        this._pluginManager.onBeforeItemAdd(pathToIndex, stats, function (pluginDatas) {
            // to the request to the database
            _this._searchClient.addItem(null, null, function (err) {
                callback(err);
            });
        });
    };

    SearchManager.prototype.close = function (callback) {
        var internalCallback = callback || function () {
        };

        return process.nextTick(callback.bind(null, null));
    };

    SearchManager.prototype.getItem = function (pathToIndex, callback) {
        // todo iplementation
        return process.nextTick(callback.bind(null, null, null));
    };

    SearchManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchManager.prototype.itemExists = function (pathToIndex, callback) {
        // todo iplementation
        return process.nextTick(callback.bind(null, null, null));
    };

    SearchManager.prototype.open = function (callback) {
    };

    SearchManager.prototype._registerPluginManagerEvents = function () {
        var _this = this;
        // todo register on plugin delete handler and remove type from index
        this._pluginManager.addEventListener('pluginAdded', function (pluginIdentifier) {
            _this._onPluginAddedListener(pluginIdentifier);
        });
    };

    SearchManager.prototype._onPluginAddedListener = function (pluginIdentifier) {
        var _this = this;
        this._searchClient.typeExists(pluginIdentifier, function (exists) {
            if (exists) {
                return;
            }

            _this._pluginManager.getActivePluginRunner(pluginIdentifier, function (pluginRunner) {
                pluginRunner.getMapping(function (mapping) {
                    if (mapping) {
                        _this._searchClient.addMapping(pluginIdentifier, mapping, function (err) {
                            if (err) {
                                console.error(err);
                            }
                        });
                    } else {
                        // plugin uses elasticsearch auto mapping feature!
                        // maybe it's better to throw an error here?
                    }
                });
            });
        });
    };
    return SearchManager;
})();

module.exports = SearchManager;
//# sourceMappingURL=SearchManager.js.map
