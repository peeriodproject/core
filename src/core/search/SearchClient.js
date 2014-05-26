/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='../../../ts-definitions/elasticsearch/elasticsearch.d.ts' />
var path = require('path');

var elasticsearch = require('elasticsearch');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.search.SearchClient
* @implements core.search.SearchClientInterface
*
* @see https://www.npmjs.org/package/base64-stream
*
* @param {core.config.ConfigInterface} config
* @param {core.search.SearchStoreFactory} searchStoreFactory
* @param {core.search.SearchClientOptions} options
*/
var SearchClient = (function () {
    function SearchClient(config, indexName, searchStoreFactory, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
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
        * The inernally used search store created via the passed in `searchStoreFactory`
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
        this._indexName = indexName.toLowerCase();
        this._searchStoreFactory = searchStoreFactory;

        this._options = ObjectUtils.extend(defaults, options);
        this._options.logsPath = path.resolve(__dirname, this._options.logsPath);

        if (this._options.closeOnProcessExit) {
            process.on('exit', function () {
                _this.close(_this._options.onCloseCallback);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    SearchClient.prototype.addItem = function (objectToIndex, callback) {
        // todo iplementation
        console.log(objectToIndex);
        var pluginIdentifiers = Object.keys(objectToIndex);
        var amount = pluginIdentifiers.length;
        var processed = 0;

        var checkCallback = function (err) {
            if (err) {
                console.error(err);
            }

            if (processed === amount) {
                callback(null);
            }
        };

        for (var i in pluginIdentifiers) {
            var identifier = pluginIdentifiers[i];

            this._addItemToPluginIndex(identifier, objectToIndex[identifier], function (err) {
                processed++;

                checkCallback(err);
            });
        }
        return process.nextTick(callback.bind(null, null, null));
    };

    SearchClient.prototype.addMapping = function (type, mapping, callback) {
        var internalCallback = callback || function () {
        };

        this._client.indices.putMapping({
            index: this._indexName,
            type: type.toLowerCase(),
            body: mapping
        }, function (err, response, status) {
            console.log(err, response, status);
            internalCallback(err);
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

            internalCallback(err);
        });
    };

    SearchClient.prototype.getItem = function (pathToIndex, callback) {
        // todo iplementation
        return process.nextTick(callback.bind(null, null, null));
    };

    SearchClient.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchClient.prototype.itemExists = function (pathToIndex, callback) {
        // todo iplementation
        return process.nextTick(callback.bind(null, null, null));
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
                    console.log(err);
                    internalCallback(err);
                } else {
                    _this._createIndex(function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            _this._isOpen = true;
                            internalCallback(null);
                        }
                    });
                }
            });
        };

        var searchStoreOptions = ObjectUtils.extend(this._searchStoreFactory.getDefaults(), ObjectUtils.extend(this._options, {
            // we are calling the searchStore#close already in our close method.
            closeOnProcessExit: !this._options.closeOnProcessExit,
            onOpenCallback: onSearchStoreOpen
        }));

        this._searchStore = this._searchStoreFactory.create(this._config, searchStoreOptions);
    };

    SearchClient.prototype.typeExists = function (type, callback) {
        this._client.indices.existsType({
            index: this._indexName,
            type: type
        }, function (err, response, status) {
            //console.log(err, response, status);
            callback(response);
        });
    };

    SearchClient.prototype._addItemToPluginIndex = function (type, data, callback) {
        this._client.index({
            index: this._indexName,
            type: type,
            refresh: true,
            body: data
        }, function (err, response, status) {
            console.log(err, response, status);

            callback(err);
        });
    };

    /**
    * Creates an index with the specified name. It will handle 'Already exists' errors gracefully.
    *
    * @param {string} name
    * @param {Function} callback
    */
    SearchClient.prototype._createIndex = function (callback) {
        this._client.indices.create({
            index: this._indexName,
            body: {
                "number_of_shards": 1,
                "number_of_replicas": 0
            }
        }, function (err, response, status) {
            // everything went fine or index already exists
            if (status === 200 || (status === 400 && err && err.message.indexOf('IndexAlreadyExistsException') === 0)) {
                callback(null);
            } else {
                callback(err);
            }
        });
    };

    /**
    * Pings the database server in a specified interval and calls the callback after a specified timeout.
    *
    * @method core.search.SearchClient~_waitForDatabaseServer
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
                        callback(new Error('SearchClient~waitForServer: Server is not reachable after 15 seconds'));
                    }
                } else {
                    callback(null);
                }
            });
        };

        check(0);
    };
    return SearchClient;
})();

module.exports = SearchClient;
//# sourceMappingURL=SearchClient.js.map
