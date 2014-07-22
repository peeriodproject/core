var events = require('events');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.share.DownloadManager
* @implements core.share.DownloadManagerInterface
*/
var DownloadManager = (function () {
    function DownloadManager(appQuitHandler, searchClient, indexName, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
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

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._searchClient.close(function (err) {
            _this._isOpen = false;

            _this._eventEmitter.removeAllListeners();
            _this._eventEmitter = null;

            _this._runningDownloadIds = null;
            _this._runningDownloadIds = [];

            return internalCallback(null);
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

            if (_this._isOpen) {
                _this._runningDownloadIds.push(responseId);
                _this._eventEmitter.emit('downloadAdded', responseId, response.itemName, response.itemStats.size, response.itemHash, response._meta);
            }

            return internalCallback(null);
        });
    };

    DownloadManager.prototype.downloadEnded = function (downloadId, reason) {
        if (this._downloadExists(downloadId)) {
            this._runningDownloadIds.splice(this._runningDownloadIds.indexOf(downloadId), 1);
            this._eventEmitter.emit('downloadEnded', downloadId, reason);
        }
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

            _this._isOpen = true;

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
    return DownloadManager;
})();

module.exports = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
