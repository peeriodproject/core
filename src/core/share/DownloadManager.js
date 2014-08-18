var events = require('events');
var fs = require('fs');
var path = require('path');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.share.DownloadManager
* @implements core.share.DownloadManagerInterface
*
* @param {core.config.ConfigInterface} config
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.utils.StateHandlerFactoryInterface} stateHandlerFactory
* @param {core.search.SearchClientInterface} searchClient
* @param {string} indexName
* @param {core.utils.ClosableAsyncOptions} options
*/
var DownloadManager = (function () {
    function DownloadManager(config, appQuitHandler, stateHandlerFactory, searchClient, indexName, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The internally used config instance
        *
        * @member {core.config.ConfigInterface} core.share.DownloadManager~_config
        */
        this._config = null;
        /**
        * The absolute path where new downloads should be stored
        *
        * @member {string} core.share.DownloadManager~_downloadDestination
        */
        this._downloadDestination = '';
        /**
        * The search index where the query responses are stored.
        *
        * @member {string} core.share.DownloadManager~_indexName
        */
        this._indexName = '';
        /**
        * A flag indicates weateher the manager is open or closed.
        *
        * @member {boolean} core.share.DownloadManager~_isOpen
        */
        this._isOpen = false;
        /**
        * The internally used event emitter to emit download updates
        *
        * @member {string} core.share.DownloadManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * The options object.
        *
        * @member {core.utils.ClosableAsyncOptions} core.share.DownloadManager~_options
        */
        this._options = {};
        /**
        * The internally used search client to get the response data that are required to start a new download
        *
        * @member {core.search.SearchClientInterface} core.share.DownloadManager~_searchClient
        */
        this._searchClient = null;
        /**
        * The state handler that manages the {@link core.share.DownloadManager~_downloadDestination}
        *
        * @member {core.utils.StateHandlerInterface} core.share.DownloadManager~_stateHandler
        */
        this._stateHandler = null;
        /**
        * A list of running download ids.
        *
        * @member {Array} core.share.DownloadManager~_runningDownloadIds
        */
        this._runningDownloadIds = [];
        var defaults = {
            closeOnProcessExit: true,
            onCloseCallback: function (err) {
            },
            onOpenCallback: function (err) {
            }
        };

        var statePath = path.join(config.get('app.dataPath'), config.get('share.downloadManagerStateConfig'));

        this._config = config;
        this._stateHandler = stateHandlerFactory.create(statePath);
        this._searchClient = searchClient;
        this._indexName = indexName;
        this._options = ObjectUtils.extend(defaults, options);

        this._eventEmitter = new events.EventEmitter();

        if (this._options.closeOnProcessExit) {
            appQuitHandler.add(function (done) {
                _this.close(done);
            });
        }

        this.open(this._options.onOpenCallback);
    }
    DownloadManager.prototype.cancelDownload = function (downloadId) {
        if (this._downloadExists(downloadId)) {
            this._eventEmitter.emit('downloadCanceled', downloadId);
        }
    };

    DownloadManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;
        var searchClientClosed = false;
        var downloadsEnded = false;
        var checkAndReturn = function (err) {
            if (err) {
                console.error(err);
            }

            if (searchClientClosed && downloadsEnded) {
                return internalCallback(err);
            }
        };

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._stateHandler.save({ destination: this._downloadDestination }, function (stateErr) {
            _this._isOpen = false;

            _this._cancelAllRunningDownloads(function () {
                _this._eventEmitter.removeAllListeners();
                _this._eventEmitter = null;

                _this._runningDownloadIds = null;
                _this._runningDownloadIds = [];

                downloadsEnded = true;

                return checkAndReturn(null);
            });

            _this._searchClient.close(function (err) {
                err = stateErr || err;

                searchClientClosed = true;

                return checkAndReturn(err);
            });
        });
    };

    DownloadManager.prototype.createDownload = function (responseId, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        if (this._downloadExists(responseId)) {
            return process.nextTick(internalCallback.bind(null, new Error('DownloadManager#createDownload: Download is already in progress.')));
        }

        this._searchClient.getIncomingResponseById(this._indexName, '', responseId, function (err, response) {
            var itemSize;

            if (err) {
                return internalCallback(err);
            } else if (!response) {
                return internalCallback(new Error('DownloadManager#createDownload: Could not find a response with the given id.'));
            }

            itemSize = response.itemStats ? response.itemStats.size : 0;

            if (!itemSize) {
                return internalCallback(new Error('DownloadManager#createDownload: Could not create download. No or empty file size provided.'));
            }

            _this.getDownloadDestination(function (err, destination) {
                if (err) {
                    return internalCallback(err);
                }

                if (_this._isOpen) {
                    _this._runningDownloadIds.push(responseId);
                    _this._eventEmitter.emit('downloadAdded', responseId, response.itemName, response.itemStats.size, response.itemHash, destination, response._meta);
                }

                return internalCallback(null);
            });
        });
    };

    DownloadManager.prototype.downloadEnded = function (downloadId, reason) {
        if (this._downloadExists(downloadId)) {
            this._runningDownloadIds.splice(this._runningDownloadIds.indexOf(downloadId), 1);
            this._eventEmitter.emit('downloadEnded', downloadId, reason);
        }
    };

    DownloadManager.prototype.getDownloadDestination = function (callback) {
        var _this = this;
        fs.exists(this._downloadDestination, function (exists) {
            if (!exists) {
                return callback(new Error('DownloadManager#getDownloadDestination: The download destination does not exists: ' + _this._downloadDestination), null);
            }

            return callback(null, _this._downloadDestination);
        });
    };

    DownloadManager.prototype.getRunningDownloadIds = function (callback) {
        return process.nextTick(callback.bind(null, this._runningDownloadIds.slice()));
    };

    DownloadManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    DownloadManager.prototype.onDownloadAdded = function (listener) {
        this._eventEmitter.addListener('downloadAdded', listener);
    };

    DownloadManager.prototype.onDownloadCanceled = function (listener) {
        this._eventEmitter.addListener('downloadCanceled', listener);
    };

    DownloadManager.prototype.onDownloadStatusChanged = function (listener) {
        this._eventEmitter.addListener('downloadStatusChanged', listener);
    };

    DownloadManager.prototype.onDownloadProgressUpdate = function (listener) {
        this._eventEmitter.addListener('downloadProgressUpdate', listener);
    };

    DownloadManager.prototype.onDownloadEnded = function (listener) {
        this._eventEmitter.addListener('downloadEnded', listener);
    };

    DownloadManager.prototype.open = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onOpenCallback;

        if (this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchClient.open(function (err) {
            if (err) {
                return internalCallback(err);
            }

            if (!_this._eventEmitter) {
                _this._eventEmitter = new events.EventEmitter();
            }

            _this._stateHandler.load(function (err, state) {
                _this._isOpen = true;

                if (state && state['destination']) {
                    _this._downloadDestination = state['destination'];
                }

                return internalCallback(null);
            });
        });
    };

    DownloadManager.prototype.setDownloadDestination = function (destinationPath, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        destinationPath = path.resolve(destinationPath);

        fs.exists(destinationPath, function (exists) {
            if (!exists) {
                return internalCallback(new Error('DownloadManager#setDownloadDestination: Cannot set the download destination. The path is does not exists: ' + _this._downloadDestination));
            }

            _this._downloadDestination = destinationPath;

            return internalCallback(null);
        });
    };

    // todo check previous status
    DownloadManager.prototype.updateDownloadStatus = function (downloadId, status) {
        if (this._downloadExists(downloadId)) {
            this._eventEmitter.emit('downloadStatusChanged', downloadId, status);
        }
    };

    // todo check previous progress
    DownloadManager.prototype.updateDownloadProgress = function (downloadId, writtenBytes, fullCountOfExpectedBytes) {
        if (this._downloadExists(downloadId)) {
            this._eventEmitter.emit('downloadProgressUpdate', downloadId, writtenBytes, fullCountOfExpectedBytes);
        }
    };

    /**
    * Returns `true` if the given download id already exists
    *
    * @method core.share.DownloadManager~_downloadExists
    *
    * @param {string} downloadId
    * @returns {boolean}
    */
    DownloadManager.prototype._downloadExists = function (downloadId) {
        return this._runningDownloadIds.indexOf(downloadId) !== -1;
    };

    DownloadManager.prototype._cancelAllRunningDownloads = function (callback) {
        var idsToWaitFor = [];

        if (!this._runningDownloadIds.length) {
            return callback();
        }

        // register extra listener
        this._eventEmitter.addListener('downloadEnded', function (downloadId) {
            var index = idsToWaitFor.indexOf(downloadId);

            if (index !== -1) {
                idsToWaitFor.splice(index, 1);
            }

            if (!idsToWaitFor.length) {
                return callback();
            }
        });

        for (var i = 0, l = this._runningDownloadIds.length; i < l; i++) {
            var id = this._runningDownloadIds[i];

            idsToWaitFor.push(id);
            this.cancelDownload(id);
        }
    };
    return DownloadManager;
})();

module.exports = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
