/// <reference path='../../../ts-definitions/node/node.d.ts' />
var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchManager
* @implements core.search.SearchManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.plugin.PluginManagerInterface} pluginManager
* @param {core.search.SearchClientInterface} searchClient
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

            //console.log(JSON.stringify(pluginData));
            // to the request to the database
            _this._searchClient.addItem(pluginData, function (err) {
                internalCallback(err);
            });
        });
    };

    SearchManager.prototype.close = function (callback) {
        var internalCallback = callback || function () {
        };

        console.log('todo SearchManager#close');

        return process.nextTick(internalCallback.bind(null, null));
    };

    SearchManager.prototype.getItem = function (pathToIndex, callback) {
        this._searchClient.getItemByPath(pathToIndex, function (err, item) {
            if (item) {
                callback(item.getHash(), item.getStats());
            } else {
                callback(null, null);
            }
        });
    };

    SearchManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchManager.prototype.itemExists = function (pathToIndex, callback) {
        console.log('todo SearchManager#itemExists');

        return process.nextTick(callback.bind(null, null, null));
    };

    SearchManager.prototype.open = function (callback) {
        var internalCallback = callback || function () {
        };

        console.log('todo SearchManager#open');

        return process.nextTick(internalCallback.bind(null, null));
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
                pluginRunner.getMapping(function (err, mapping) {
                    if (err) {
                        console.error(err);
                    }
                    if (mapping) {
                        mapping = _this._updateMapping(mapping);

                        _this._searchClient.addMapping(pluginIdentifier, mapping, function (err) {
                            if (err) {
                                console.error(err);
                            }
                        });
                    } else {
                        // todo plugin uses elasticsearch auto mapping feature! Maybe it's better to throw an error here?
                        console.log('todo: plugin uses elasticsearch auto mapping feature! Maybe it\'s better to throw an error here?');
                    }
                });
            });
        });
    };

    /**
    * Updates the given mapping by adding the item hash, item path and item stats.
    *
    * @method core.search.SearchManager~_updateMapping
    *
    * @param {Object} mapping
    * @returns {Object} the restricted mapping
    */
    SearchManager.prototype._updateMapping = function (mapping) {
        var source = mapping['_source'] || {};
        var properties = mapping['properties'] || {};

        // remove file content from source
        // todo iterate over mapping and find attachment field by type
        if (properties && properties['file']) {
            mapping['_source'] = ObjectUtils.extend(source, {
                excludes: ['file']
            });
        }

        // update properties
        mapping['properties'] = ObjectUtils.extend(properties, {
            itemHash: {
                type: 'string',
                store: 'yes',
                index: 'not_analyzed'
            },
            itemPath: {
                type: 'string',
                store: 'yes',
                index: 'not_analyzed'
            },
            itemStats: {
                type: 'nested',
                properties: {
                    atime: {
                        type: 'date',
                        format: 'dateOptionalTime',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    blksize: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    blocks: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    ctime: {
                        type: 'date',
                        format: 'dateOptionalTime',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    dev: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    gid: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    ino: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    mode: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    mtime: {
                        type: 'date',
                        format: 'dateOptionalTime',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    nlink: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    rdev: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    size: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    },
                    uid: {
                        type: 'long',
                        store: 'yes',
                        index: 'not_analyzed'
                    }
                }
            }
        });

        return mapping;
    };

    /**
    * Updates the given plugin data by adding the item path, stats and hash to each plugin identifier object
    *
    * @method core.search.SearchManager~_updatePluginData
    *
    * @param {Object} pluginData
    * @param {string} itemPath
    * @param {fs.Stats} stats
    * @param {string} fileHash
    * @returns {Object} the updated plugin data
    */
    SearchManager.prototype._updatePluginData = function (pluginData, itemPath, stats, fileHash) {
        var identifiers = Object.keys(pluginData);

        if (identifiers.length) {
            for (var i = 0, l = identifiers.length; i < l; i++) {
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
