/// <reference path='../../../ts-definitions/node/node.d.ts' />
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
    function SearchClient(config, searchStoreFactory, options) {
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
    SearchClient.prototype.addItem = function (pathToIndex, stats, callback) {
        // todo iplementation
        return process.nextTick(callback.bind(null, null, null));
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
                    _this._isOpen = true;
                    internalCallback(null);
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
