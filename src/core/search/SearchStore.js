/// <reference path='../../../ts-definitions/node/node.d.ts' />
var elasticsearch = require('elasticsearch');

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/
*
* todo restart the database server whenever it stops (aka. forever)
*
* @class core.search.SearchStore
* @implements core.search.SearchStoreInterface
*/
var SearchStore = (function () {
    function SearchStore(config, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The client which is used internally to make requests against the database api
        *
        * @member {elasticsearch.Client} core.search.SearchStore~_client
        */
        this._client = null;
        /**
        * The internally used config object
        *
        * @member {core.config.ConfigInterface} core.search.SearchStore~_config
        */
        this._config = null;
        /**
        * The child process that starts the database server
        *
        * @member {ChildProcess} core.search.SearchStore~_serverProcess
        */
        this._databaseServerProcess = null;
        /**
        * The process id of the database server
        *
        * @member {number} core.search.SearchStore~_serverProcessId
        */
        this._databaseServerProcessId = -1;
        /**
        * A flag indicates weather the store is closed or open
        *
        * @member {boolean} core.search.SearchStore~_isOpen
        */
        this._isOpen = false;
        /**
        * The mix of the passed in options object and the defaults
        *
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchStore~_options
        */
        this._options = null;
        var defaults = {
            closeOnProcessExit: true,
            logsPath: '../../logs',
            logsFileName: 'searchStore.log',
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;
        this._options = ObjectUtils.extend(defaults, options);
        this._options.logsPath = path.resolve(__dirname, this._options.logsPath);

        if (this._options.closeOnProcessExit) {
            process.on('exit', function () {
                _this.close(_this._options.onCloseCallback);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    SearchStore.prototype.close = function (callback) {
        var internalCallback = callback || this._options.onCloseCallback;

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        // kill the elasticsearch deamon
        if (this._databaseServerProcessId !== -1) {
            try  {
                process.kill(this._databaseServerProcessId);
            } catch (err) {
                // todo log process not found!
                console.error('process was killed before...');
            }
        }

        this._databaseServerProcess.kill();
        this._isOpen = false;
        this._client = null;

        return process.nextTick(internalCallback.bind(null, null));
    };

    SearchStore.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    SearchStore.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._startUpDatabaseServer(function (err) {
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
        });
    };

    /**
    * Returns the path to the database server module
    *
    * @method core.search.SearchStore~_getDatabaseServerModulePath
    *
    * @returns {string}
    */
    SearchStore.prototype._getDatabaseServerModulePath = function () {
        return path.join(__dirname, '../../bin/', this._config.get('search.binaryPath'));
    };

    /**
    * Returns the path to the database server binary.
    *
    * todo add windows switch to elasticsearch.bat!
    *
    * @method core.search.SearchStore~_getDatabaseServerBinaryPath
    *
    * @returns {string}
    */
    SearchStore.prototype._getDatabaseServerBinaryPath = function () {
        var osPath = 'bin/elasticsearch';

        return path.join(this._getDatabaseServerModulePath(), osPath);
    };

    /**
    * Returns the arguments the database server should start with. The following options are currently included:
    *
    * - -p:
    * - -Des.config:
    * - -Des.path.data:
    *
    * @method core.search.SearchStore~_getDatabaseServerProcessArgs
    *
    * @returns {string[]}
    */
    SearchStore.prototype._getDatabaseServerProcessArgs = function () {
        var configPath = path.resolve(__dirname, '../../', this._config.get('search.searchStoreConfig'));
        var storagePath = path.resolve(__dirname, '../../', this._config.get('search.databasePath'));

        return [
            '-p',
            this._getDatabaseServerProcessIdPath(),
            ('-Des.config=' + configPath),
            ('-Des.path.data=' + storagePath),
            '-d'
        ];
    };

    /**
    * Returns the path where to look up the database server process id.
    *
    * @method core.search.SearchStore~_getDatabaseServerProcessIdPath
    *
    * @returns {string}
    */
    SearchStore.prototype._getDatabaseServerProcessIdPath = function () {
        return path.join(this._getDatabaseServerModulePath(), '../elasticsearch-pid');
    };

    /**
    * Pings the database server in a specified interval and calls the callback after a specified timeout.
    *
    * @method core.search.SearchStore~_waitForDatabaseServer
    */
    SearchStore.prototype._waitForDatabaseServer = function (callback) {
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
                        callback(new Error('SearchStore~waitForServer: Server is not reachable after 15 seconds'));
                    }
                } else {
                    callback(null);
                }
            });
        };

        check(0);
    };

    /**
    * Uses a child process to start up the database server and reads it process id from the {@link core.search.SearchStore~_getDatabaseServerProcessIdPath}
    * and stores it in {@link core.search.SearchStore~_databaseServerProcessId} before calling the callback function.
    *
    * @method core.search.SearchStore~_startUpDatabaseServer
    *
    * @param {Function} callback
    */
    SearchStore.prototype._startUpDatabaseServer = function (callback) {
        var _this = this;
        this._databaseServerProcess = childProcess.execFile(this._getDatabaseServerBinaryPath(), this._getDatabaseServerProcessArgs(), {}, function (err, stdout, stderr) {
            fs.readFile(_this._getDatabaseServerProcessIdPath(), {
                encoding: 'ascii'
            }, function (err, data) {
                var pid = parseInt(data, 10);

                if (err || isNaN(pid)) {
                    callback(err);
                } else {
                    _this._databaseServerProcessId = pid;
                    callback(null);
                }
            });
        });
    };
    return SearchStore;
})();

module.exports = SearchStore;
//# sourceMappingURL=SearchStore.js.map
