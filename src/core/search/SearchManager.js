/// <reference path='../../../ts-definitions/node/node.d.ts' />
var ObjectUtils = require('../utils/ObjectUtils');

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
    SearchManager.prototype.addItem = function (pathToIndex, stats, fileHash, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        this._pluginManager.onBeforeItemAdd(pathToIndex, stats, fileHash, function (pluginData) {
            pluginData = _this._updatePluginData(pluginData, pathToIndex, stats, fileHash);
            console.log(JSON.stringify(pluginData));

            // to the request to the database
            _this._searchClient.addItem(pluginData, function (err) {
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
                        mapping = _this._updateMapping(mapping);
                        console.log(mapping);
                        _this._searchClient.addMapping(pluginIdentifier, mapping, function (err) {
                            if (err) {
                                console.log('after search client added mapping');
                                console.error(err);
                            }
                        });
                    } else {
                        // todo plugin uses elasticsearch auto mapping feature! Maybe it's better to throw an error here?
                    }
                });
            });
        });
    };

    /**
    * Updates the given mapping.
    *
    * @param {Object} mapping
    * @param {boolean} isApacheTikaPlugin
    * @returns {Object} the restricted mapping
    */
    SearchManager.prototype._updateMapping = function (mapping) {
        var source = mapping['_source'] || {};
        var properties = mapping['properties'] || {};

        // remove file content from source
        // todo iterate over mapping and find attachment filed by type
        if (properties && properties['file']) {
            mapping['_source'] = ObjectUtils.extend(source, {
                excludes: 'file'
            });
        }

        // update properties
        mapping['properties'] = ObjectUtils.extend(properties, {
            itemHash: {
                type: 'string',
                store: 'yes'
            },
            itemPath: {
                type: 'string',
                store: 'yes'
            }
        });

        return mapping;
    };

    SearchManager.prototype._updatePluginData = function (pluginData, itemPath, stats, fileHash) {
        var identifiers = Object.keys(pluginData);

        if (identifiers.length) {
            for (var i in identifiers) {
                var identifier = identifiers[i];

                pluginData[identifier] = ObjectUtils.extend(pluginData[identifier], {
                    itemHash: fileHash,
                    itemPath: itemPath,
                    itemStats: stats
                });
            }
        }
        return pluginData;
    };
    return SearchManager;
})();

module.exports = SearchManager;
//# sourceMappingURL=SearchManager.js.map
