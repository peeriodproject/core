var events = require('events');

var ObjectUtils = require('../utils/ObjectUtils');

/**
* @class core.share.UploadManager
* @implements core.share.UploadManagerInterface
*
* @param {core.utils.AppQuitHandlerInterface} appQuitHandler
* @param {core.search.SearchClientInterface} searchClient
* @param {string} indexName
* @param {core.utils.ClosableAsyncOptions} options
*/
var UploadManager = (function () {
    function UploadManager(appQuitHandler, searchClient, indexName, options) {
        if (typeof options === "undefined") { options = {}; }
        var _this = this;
        /**
        * The search index where the query responses are stored.
        *
        * @member {string} core.share.UploadManager~_indexName
        */
        this._indexName = '';
        /**
        * A flag indicates weateher the manager is open or closed.
        *
        * @member {boolean} core.share.UploadManager~_isOpen
        */
        this._isOpen = false;
        /**
        * The internally used event emitter to emit upload updates
        *
        * @member {string} core.share.UploadManager~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * The options object.
        *
        * @member {core.utils.ClosableAsyncOptions} core.share.UploadManager~_options
        */
        this._options = {};
        /**
        * The internally used search client to get the response data that are required to start a new upload
        *
        * @member {core.search.SearchClientInterface} core.share.UploadManager~_searchClient
        */
        this._searchClient = null;
        /**
        * A list of running upload ids.
        *
        * @member {Array} core.share.UploadManager~_runningUploadIds
        */
        this._runningUploadIds = [];
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
    UploadManager.prototype.cancelUpload = function (uploadId) {
        if (this._uploadExists(uploadId)) {
            this._eventEmitter.emit('uploadCanceled', uploadId);
        }
    };

    UploadManager.prototype.close = function (callback) {
        var _this = this;
        var internalCallback = callback || this._options.onCloseCallback;
        var searchClientClosed = false;
        var uploadsEnded = false;
        var checkAndReturn = function (err) {
            if (err) {
                console.error(err);
            }

            if (searchClientClosed && uploadsEnded) {
                return internalCallback(err);
            }
        };

        if (!this._isOpen) {
            return process.nextTick(internalCallback.bind(null, null));
        }

        this._isOpen = false;

        this._cancelAllRunningUploads(function () {
            _this._eventEmitter.removeAllListeners();
            _this._eventEmitter = null;

            _this._runningUploadIds = null;
            _this._runningUploadIds = [];

            uploadsEnded = true;

            return checkAndReturn(null);
        });

        this._searchClient.close(function (err) {
            searchClientClosed = true;

            return checkAndReturn(err);
        });
    };

    UploadManager.prototype.createUpload = function (uploadId, filePath, fileName, fileSize) {
        if (this._runningUploadIds.indexOf(uploadId) !== -1) {
            return;
        }

        this._runningUploadIds.push(uploadId);

        this._eventEmitter.emit('uploadAdded', uploadId, filePath, fileName, fileSize);
    };

    UploadManager.prototype.getFileInfoByHash = function (fileHash, callback) {
        this._searchClient.getItemByHash(fileHash, function (err, item) {
            if (err) {
                return callback(err, null, null, null);
            }

            return callback(null, item.getPath(), item.getName(), item.getStats().size);
        });
    };

    UploadManager.prototype.getRunningUploadIds = function (callback) {
        return process.nextTick(callback.bind(null, this._runningUploadIds.slice()));
    };

    UploadManager.prototype.isOpen = function (callback) {
        return process.nextTick(callback.bind(null, null, this._isOpen));
    };

    UploadManager.prototype.onUploadAdded = function (listener) {
        this._eventEmitter.addListener('downloadAdded', listener);
    };

    UploadManager.prototype.onUploadCanceled = function (listener) {
        this._eventEmitter.addListener('uploadCanceled', listener);
    };

    UploadManager.prototype.onUploadStatusChanged = function (listener) {
        this._eventEmitter.addListener('uploadStatusChanged', listener);
    };

    UploadManager.prototype.open = function (callback) {
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

            return internalCallback(null);
        });
    };

    UploadManager.prototype.updateUploadStatus = function (uploadId, status) {
        if (this._uploadExists(uploadId)) {
            this._eventEmitter.emit('uploadStatusChanged', uploadId, status);
        }
    };

    UploadManager.prototype.uploadEnded = function (uploadId, reason) {
        if (this._uploadExists(uploadId)) {
            this._runningUploadIds.splice(this._runningUploadIds.indexOf(uploadId), 1);
            this._eventEmitter.emit('uploadEnded', uploadId, reason);
        }
    };

    UploadManager.prototype._cancelAllRunningUploads = function (callback) {
        var idsToWaitFor = [];

        if (!this._runningUploadIds.length) {
            return callback();
        }

        // register extra listener
        this._eventEmitter.addListener('uploadEnded', function (uploadId) {
            var index = idsToWaitFor.indexOf(uploadId);

            if (index !== -1) {
                idsToWaitFor.splice(index, 1);
            }

            if (!idsToWaitFor.length) {
                return callback();
            }
        });

        for (var i = 0, l = this._runningUploadIds.length; i < l; i++) {
            var id = this._runningUploadIds[i];

            idsToWaitFor.push(id);
            this.cancelUpload(id);
        }
    };

    /**
    * Returns `true` if the given upload id already exists
    *
    * @method core.share.UploadManager~_uploadExists
    *
    * @param {string} uploadId
    * @returns {boolean}
    */
    UploadManager.prototype._uploadExists = function (uploadId) {
        return this._runningUploadIds.indexOf(uploadId) !== -1;
    };
    return UploadManager;
})();

module.exports = UploadManager;
//# sourceMappingURL=UploadManager.js.map
