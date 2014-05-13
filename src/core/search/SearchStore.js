/// <reference path='../../../ts-definitions/node/node.d.ts' />
var elasticsearch = require('elasticsearch');
var childProcess = require('child_process');
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/
*
* @class core.search.SearchStore
* @implements core.search.SearchStoreInterface
*/
var SearchStore = (function () {
    function SearchStore(config, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        this._client = null;
        this._config = null;
        /**
        * The mix of the passed in options object and the defaults
        *
        * @member {core.utils.ClosableAsyncOptions} core.search.SearchStore~_options
        */
        this._options = null;
        this._serverProcess = null;
        var defaults = {
            closeOnProcessExit: true,
            logPath: '../../logs/searchStore.log',
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        this._config = config;

        this._options = ObjectUtils.extend(defaults, options);
        this._options.logPath = path.join(__dirname, this._options.logPath);

        process.on('exit', function () {
            _this.close(_this._options.onCloseCallback);
        });

        this.open(this._options.onOpenCallback);
    }
    SearchStore.prototype.close = function (callback) {
        var internalCallback = callback || this._options.onCloseCallback;

        this._serverProcess.kill();
    };

    SearchStore.prototype.isOpen = function (callback) {
    };

    SearchStore.prototype.open = function (callback) {
        var internalCallback = callback || this._options.onOpenCallback;

        this._startUpServer();

        this._client = elasticsearch.Client({
            host: this._config.get('search.host') + ':' + this._config.get('search.port'),
            log: {
                type: 'file',
                level: 'trace',
                path: this._options.logPath
            }
        });

        this._waitForServer(internalCallback);
    };

    SearchStore.prototype._waitForServer = function (callback) {
        var _this = this;
        var check = function (i) {
            _this._client.ping({
                requestTimeout: 1000,
                hello: 'elasticsearch'
            }, function (err) {
                if (err) {
                    if (i < 30) {
                        setTimeout(function () {
                            //console.error('elasticsearch cluster is down!');
                            check(++i);
                        }, 500);
                    } else {
                        callback(new Error('SearchStore~waitForServer: Server is after 15000ms still not reachable'));
                    }
                } else {
                    console.log('All is well');
                    callback(null);
                }
            });
        };

        check(0);
    };

    SearchStore.prototype._startUpServer = function () {
        // todo add windows switch to elasticsearch.bat here
        var osPath = 'bin/elasticsearch';
        var searchPath = path.join(__dirname, '../../bin/', this._config.get('search.binaryPath'));
        var binaryPath = path.join(searchPath, osPath);

        this._serverProcess = childProcess.execFile(binaryPath, ['-p', path.join(searchPath, '../elasticsearch-pid')], {}, function (err, stdout, stderr) {
        });
        //console.log(this._serverProcess);
    };
    return SearchStore;
})();

module.exports = SearchStore;
//# sourceMappingURL=SearchStore.js.map
