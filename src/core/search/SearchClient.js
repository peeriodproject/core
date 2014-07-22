/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/elasticsearch/elasticsearch.d.ts' />
var path = require('path');

var elasticsearch = require('elasticsearch');

var ObjectUtils = require('../utils/ObjectUtils');

var logger = require('../utils/logger/LoggerFactory').create();

/**
* @class core.search.SearchClient
* @implements core.search.SearchClientInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.search.SearchStoreFactory} searchStoreFactory
* @param {core.search.SearchClientOptions} options
*/
var SearchClient = (function () {
    function SearchClient(config, appQuitHandler, indexName, searchStoreFactory, searchItemFactory, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The internally used appQuitHandler instance
        *
        * @member {core.utils.AppQuitHandler} core.search.SearchClient~_appQuitHandler
        */
        this._appQuitHandler = null;
        /**
        * The client which is used internally to make requests against the database api
        *
        * @member {elasticsearch.Client} core.search.SearchClient~_client
        */
        this._client = null;
        /**
        * The internally used config object
        *
        * @member {core.config.ConfigInterface} core.search.SearchClient~_config
        */
        this._config = null;
        /**
        * The index name this client is managing.
        *
        * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices.html
        *
        * @member {core.config.ConfigInterface} core.search.SearchClient~_indexName
        */
        this._indexName = null;
        /**
        * A flag indicates weather the client is closed or open
        *
        * @member {boolean} core.search.SearchClient~_isOpen
        */
        this._isOpen = false;
        /**
        * The mix of the passed in options object and the defaults
        *
        * @member {core.utils.SearchClientOptions} core.search.SearchClient~_options
        */
        this._options = null;
        /**
        * The internally used search item factory
        *
        * @member {core.search.SearchItemFactoryInterface} core.search.SearchClient~_searchItemFactory
        */
        this._searchItemFactory = null;
        /**
        * The internally used search store created via the passed in `searchStoreFactory`
        *
        * @member {core.utils.SearchStoreInterface} core.search.SearchClient~_searchStore
        */
        this._searchStore = null;
        /**
        * The inernally used search store factory.
        *
        * @member {core.utils.SearchStoreFactory} core.search.SearchClient~_searchStoreFactory
        */
        this._searchStoreFactory = null;
        var defaults = {
            logsPath: '../../logs',
            logsFileName: 'searchStore.log',
            closeOnProcessExit: true,
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;
        this._appQuitHandler = appQuitHandler;
        this._indexName = indexName.toLowerCase();
        this._searchStoreFactory = searchStoreFactory;
        this._searchItemFactory = searchItemFactory;

        this._options = ObjectUtils.extend(defaults, options);
        this._options.logsPath = path.resolve(__dirname, this._options.logsPath);

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    SearchClient.prototype.addIncomingResponse = function (indexName, type, responseBody, responseMeta, callback) {
        var internalCallback = callback || function (err) {
        };

        var body = ObjectUtils.extend(responseBody, {
            _meta: responseMeta
        });

        this._client.index({
            index: indexName.toLowerCase(),
            type: this._getResponseType(type),
            body: body,
            refresh: true
        }, function (err, response, status) {
            err = err || null;

            return internalCallback(err);
        });
    };

    SearchClient.prototype.checkIncomingResponse = function (indexName, type, responseBody, callback) {
        var internalCallback = callback || function (err, response) {
        };

        this._client.percolate({
            index: indexName.toLowerCase(),
            type: this._getResponseType(type),
            body: {
                doc: responseBody
            }
        }, function (err, response, status) {
            var matches = response && response['total'] ? response['matches'] : [];

            err = err || null;

            return internalCallback(err, matches);
        });
    };

    SearchClient.prototype.addItem = function (objectToIndex, callback) {
        var pluginIdentifiers = Object.keys(objectToIndex);
        var amount = pluginIdentifiers.length;
        var itemIds = [];

        var checkCallback = function (err) {
            if (err) {
                console.error(err);
            }

            if (itemIds.length === amount) {
                callback(null, itemIds);
            }
        };

        if (!pluginIdentifiers.length) {
            return process.nextTick(callback.bind(null, new Error('SearchClient.addItem: No item data specified! Preventing item creation.'), null));
        }

        for (var i = 0, l = pluginIdentifiers.length; i < l; i++) {
            var identifier = pluginIdentifiers[i];

            this._addItemToPluginIndex(identifier.toLowerCase(), objectToIndex[identifier], function (err, id) {
                itemIds.push(id);

                return checkCallback(err);
            });
        }
    };

    SearchClient.prototype.addMapping = function (type, mapping, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        this._createIndex(this._indexName, null, function (err) {
            var map = null;
            if (Object.keys(mapping).length !== 1 || Object.keys(mapping)[0] !== type) {
                // wrap mapping in type root
                map = {};
                map[type.toLowerCase()] = mapping;
            } else {
                map = mapping;
            }

            if (!(!err && _this._client)) {
                return internalCallback(err);
            }

            _this._client.indices.putMapping({
                index: _this._indexName,
                type: type.toLowerCase(),
                body: map
            }, function (err, response, status) {
                err = err || null;
                internalCallback(err);
            });
        });
    };

    SearchClient.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchStore.close(function (err) {
            _this._isOpen = false;
            _this._client = null;

            return internalCallback(err);
        });
    };

    SearchClient.prototype.createOutgoingQuery = function (indexName, id, queryBody, callback) {
        var internalCallback = callback || function (err) {
        };

        this._client.index({
            index: indexName.toLowerCase(),
            type: '.percolator',
            id: id,
            body: queryBody
        }, function (err, response, status) {
            err = err || null;

            return internalCallback(err);
        });
    };

    SearchClient.prototype.createOutgoingQueryIndex = function (indexName, callback) {
        var internalCallback = callback || function (err) {
        };

        var mapping = {
            _default_: {
                meta: {
                    type: 'object',
                    index: 'no'
                },
                _timestamp: {
                    enabled: true,
                    store: true
                }
            }
        };

        indexName = indexName.toLowerCase();

        this._createIndex(indexName, mapping, function (err) {
            if (err) {
                console.error(err);
                return internalCallback(err);
            }

            return internalCallback(err);
        });
    };

    SearchClient.prototype.deleteIndex = function (callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };

        if (!(this._isOpen && this._client)) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._client.indices.delete({
            index: this._indexName
        }, function (err, response, status) {
            if (!_this._isValidResponse(err, status, 'IndexMissingException')) {
                return internalCallback(err);
            }

            return internalCallback(null);
        });
    };

    SearchClient.prototype.deleteOutgoingQuery = function (indexName, queryId, callback) {
        var _this = this;
        var internalCallback = callback || function (err) {
        };
        var queryDeleted = false;
        var responsesDeleted = false;

        var checkCallback = function (err) {
            if (err) {
                queryDeleted = false;
                responsesDeleted = false;

                console.error(err);

                return internalCallback(err);
            } else if (queryDeleted && responsesDeleted) {
                return internalCallback(null);
            }
        };

        if (!(this._isOpen && this._client)) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        indexName = indexName.toLowerCase();

        // delete query
        this._client.delete({
            index: indexName,
            type: '.percolator',
            id: queryId
        }, function (err, response, status) {
            if (_this._isValidResponse(err, status, 'IndexMissingException') || _this._isValidResponse(err, status, 'Not Found')) {
                err = null;
            }

            queryDeleted = true;

            return checkCallback(err);
        });

        // delete all responses for the queryId
        this._client.deleteByQuery({
            index: indexName,
            type: this._getResponseType(queryId),
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                match_all: {}
                            }
                        ]
                    }
                }
            }
        }, function (err, response, status) {
            if (_this._isValidResponse(err, status, 'IndexMissingException')) {
                err = null;
            }

            responsesDeleted = true;

            return checkCallback(err);
        });
    };

    SearchClient.prototype.getIncomingResponseByHash = function (indexName, type, hash, callback) {
        var _this = this;
        // todo limit query to 1
        var searchQuery = {
            query: {
                match: {
                    itemHash: hash
                }
            }
        };

        this._client.search({
            index: indexName.toLowerCase(),
            type: (!type || type === '_all') ? '' : this._getResponseType(type),
            body: searchQuery
        }, function (err, response, status) {
            return _this._checkHitsAndCallCallback(err, response, status, function (err, data) {
                if (err || !data) {
                    return callback(err, data);
                }

                return callback(null, data.hits[0]);
            });
        });
    };

    SearchClient.prototype.getIncomingResponseById = function (indexName, type, id, callback) {
        var _this = this;
        this._client.getSource({
            index: indexName,
            type: (!type || type === '_all') ? '_all' : this._getResponseType(type),
            id: id
        }, function (err, response, status) {
            err = err || null;

            if (!_this._isValidResponse(err, status, 'IndexMissingException')) {
                return callback(err, null);
            }

            return callback(null, response);
        });
    };

    SearchClient.prototype.getIncomingResponses = function (indexName, type, queryBody, callback) {
        var _this = this;
        this._client.search({
            index: indexName.toLowerCase(),
            type: this._getResponseType(type),
            body: queryBody,
            fields: [
                '_source',
                '_timestamp'
            ]
        }, function (err, response, status) {
            return _this._checkHitsAndCallCallback(err, response, status, callback);
        });
    };

    SearchClient.prototype.getItemById = function (id, callback) {
        var _this = this;
        this._client.get({
            index: this._indexName,
            type: '_all',
            id: id
        }, function (err, response, status) {
            err = err || null;

            if (!_this._isValidResponse(err, status, 'IndexMissingException')) {
                return callback(err, null);
            }

            return callback(null, _this._createSearchItemFromResponse(response));
        });
    };

    SearchClient.prototype.getItemByPath = function (itemPath, callback) {
        var _this = this;
        // todo limit query to 1
        var searchQuery = {
            query: {
                match: {
                    itemPath: itemPath
                }
            }
        };

        this._client.search({
            index: this._indexName,
            body: searchQuery
        }, function (err, response, status) {
            var hits = response && response['hits'] ? response['hits'] : {};

            err = err || null;

            if (!_this._isValidResponse(err, status, 'IndexMissingException')) {
                return callback(err, null);
            }

            if (!(hits && hits['total'])) {
                return callback(null, null);
            }

            return callback(null, _this._createSearchItemFromHits(hits['hits']));
        });
    };

    SearchClient.prototype.getOutgoingQuery = function (indexName, queryId, callback) {
        var _this = this;
        this._client.getSource({
            index: indexName.toLowerCase(),
            type: '.percolator',
            id: queryId
        }, function (err, response, status) {
            if (!_this._isValidResponse(err, status, 'Not Found')) {
                return callback(err, null);
            }

            response = response || null;

            return callback(null, response);
        });
    };

    SearchClient.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchClient.prototype.itemExists = function (pathToIndex, callback) {
        console.log('todo SearchClient#itemExists');

        // todo iplementation
        return process.nextTick(callback.bind(null, null, null));
    };

    SearchClient.prototype.itemExistsById = function (id, callback) {
        this._client.exists({
            index: this._indexName,
            type: '_all',
            id: id
        }, function (err, exists) {
            return callback(exists === true);
        });
    };

    SearchClient.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        var onSearchStoreOpen = function (err) {
            if (err) {
                return internalCallback(err);
            }

            _this._client = elasticsearch.Client({
                apiVersion: _this._config.get('search.apiVersion', '1.1'),
                host: _this._config.get('search.host') + ':' + _this._config.get('search.port'),
                log: {
                    type: 'file',
                    level: 'trace',
                    path: path.join(_this._options.logsPath, _this._options.logsFileName)
                }
            });

            _this._waitForDatabaseServer(function (err) {
                if (err) {
                    logger.error(err);
                    return internalCallback(err);
                }

                _this._createIndex(_this._indexName, null, function (err) {
                    err = err || null;

                    if (!err) {
                        _this._isOpen = true;
                    }

                    return internalCallback(null);
                });
            });
        };

        var searchStoreOptions = ObjectUtils.extend(this._searchStoreFactory.getDefaults(), ObjectUtils.extend(this._options, {
            // we are calling the searchStore#close already in our close method.
            closeOnProcessExit: !this._options.closeOnProcessExit,
            onOpenCallback: onSearchStoreOpen
        }));

        this._searchStore = this._searchStoreFactory.create(this._config, this._appQuitHandler, searchStoreOptions);
    };

    SearchClient.prototype.search = function (queryObject, callback) {
        this._client.search({
            index: this._indexName,
            body: queryObject
        }, function (err, response, status) {
            var hits = response && response['hits'] ? response['hits'] : null;

            err = err || null;

            if (err) {
                logger.error(err);
            }

            return callback(err, hits);
        });
    };

    SearchClient.prototype.typeExists = function (type, callback) {
        if (this._client) {
            this._client.indices.existsType({
                index: this._indexName,
                type: type.toLowerCase()
            }, function (err, response, status) {
                return callback(response);
            });
        } else {
            return callback(false);
        }
    };

    /**
    * Creates a new `type` item and stores the given data within the {@link core.search.SearchClient~_indexName} index.
    *
    * @method core.search.SearchClient~_addItemToPluginIndex
    *
    * @param {string} type The type of the item. Usually the plugin identifier
    * @param {Object} data The data to store
    * @param {Function} callback
    */
    SearchClient.prototype._addItemToPluginIndex = function (type, data, callback) {
        this._client.index({
            index: this._indexName,
            type: type,
            refresh: true,
            body: data
        }, function (err, response, status) {
            if (response && response['created']) {
                return callback(err, response['_id']);
            } else {
                return callback(err, null);
            }
        });
    };

    /**
    * Checks if the specified response contains any hits or errors and calls the callback accordingly.
    *
    * @method core.search.SearchClient~_checkHitsAnCallCallback
    *
    * @param {Error} err
    * @param {Object} response
    * @param {status} status
    * @param {Function} callback
    */
    SearchClient.prototype._checkHitsAndCallCallback = function (err, response, status, callback) {
        var hits = response && response['hits'] ? response['hits'] : {};

        err = err || null;

        if (!(hits && hits['total'])) {
            return callback(err, null);
        }

        return callback(null, hits);
    };

    /**
    * Creates an index with the specified name. It will handle 'Already exists' errors gracefully.
    *
    * @method core.search.SearchClient~_createIndex
    *
    * @param {string} indexName
    * @param {Object|Null} mapping The optional mapping to stick to the index.
    * @param {Function} callback
    */
    SearchClient.prototype._createIndex = function (indexName, mapping, callback) {
        var _this = this;
        var params = {
            index: indexName
        };

        if (mapping) {
            params = ObjectUtils.extend(params, {
                body: {
                    mappings: mapping
                }
            });
        }

        this._client.indices.create(params, function (err, response, status) {
            // everything went fine or index already exists
            if (_this._isValidResponse(err, status, 'IndexAlreadyExistsException')) {
                return callback(null);
            } else {
                return callback(err);
            }
        });
    };

    SearchClient.prototype._createSearchItemFromHits = function (hits) {
        if (!hits || !hits.length) {
            return null;
        }

        return this._searchItemFactory.create(hits);
    };

    SearchClient.prototype._createSearchItemFromResponse = function (response) {
        if (!response) {
            return null;
        }

        return this._searchItemFactory.create([response]);
    };

    /**
    * Returns the prefixed lowercase type
    *
    * @method core.search.SearchClient~_getResponseType
    *
    * @param type
    * @returns {string}
    */
    SearchClient.prototype._getResponseType = function (type) {
        return type[0] === '_' ? type : 'response' + type.toLowerCase();
    };

    /**
    * Pings the database server in a specified interval and calls the callback after a specified timeout.
    *
    * @method core.search.SearchClient~_waitForDatabaseServer
    *
    * @param {Function} callback
    */
    SearchClient.prototype._waitForDatabaseServer = function (callback) {
        var _this = this;
        var check = function (i) {
            _this._client.ping({
                requestTimeout: 1000,
                hello: 'elasticsearch'
            }, function (err) {
                if (err) {
                    if (i < 30) {
                        setTimeout(function () {
                            check(++i);
                        }, 500);
                    } else {
                        return callback(new Error('SearchClient~waitForServer: Server is not reachable after 15 seconds'));
                    }
                } else {
                    return callback(null);
                }
            });
        };

        check(0);
    };

    /**
    * Returns `true` if the given response objects matches with the http status code ( >= 200 < 300) or the error matches the specified error name.
    * This method is used to gracefully ignore expected errors such as `not found` or `already exists`.
    *
    * @method core.search.SearchClient~_isValidResponse
    *
    * @param {Error} err
    * @param {number} status
    * @param {string} errorNameToIgnore
    * @returns {boolean}
    */
    SearchClient.prototype._isValidResponse = function (err, status, errorNameToIgnore) {
        return ((status >= 200 && status < 300) || (status >= 400 && err && err.message.indexOf(errorNameToIgnore) === 0)) ? true : false;
    };
    return SearchClient;
})();

module.exports = SearchClient;
//# sourceMappingURL=SearchClient.js.map
