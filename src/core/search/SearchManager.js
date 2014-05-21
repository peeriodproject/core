/// <reference path='../../../ts-definitions/node/node.d.ts' />
var SearchManager = (function () {
    function SearchManager(config, pluginManager, searchClient) {
        this._config = null;
        this._isOpen = false;
        this._pluginManager = null;
        this._searchClient = null;
        this._config = config;
        this._pluginManager = pluginManager;
        this._searchClient = searchClient;
    }
    SearchManager.prototype.addItem = function (pathToIndex, stats, callback) {
        this._pluginManager.onBeforeItemAdd(pathToIndex, stats, function () {
            // to the request to the database
            //this._searchClient
            // call callback
        });
    };

    SearchManager.prototype.close = function (callback) {
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
    return SearchManager;
})();

module.exports = SearchManager;
//# sourceMappingURL=SearchManager.js.map
