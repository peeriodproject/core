var DownloadManager = (function () {
    function DownloadManager(transferConfig, circuitManager, downloadBridge, downloadFactory) {
        this._downloadFactory = null;
        this._maximumNumberOfParallelDownloads = 0;
        this._activeDownloads = {};
        this._bridge = null;
        this._circuitManager = null;
        this._downloadFactory = downloadFactory;
        this._bridge = downloadBridge;
        this._maximumNumberOfParallelDownloads = transferConfig.get('fileTransfer.maximumNumberOfParallelDownloads');
        this._circuitManager = circuitManager;

        this._setupListeners();
    }
    DownloadManager.prototype._canDownload = function () {
        var reason = null;

        if (Object.keys(this._activeDownloads).length >= this._maximumNumberOfParallelDownloads) {
            reason = 'MAX_DOWNLOADS_EXCEED';
        } else if (!this._circuitManager.getReadyCircuits().length) {
            reason = 'NO_ANON';
        }

        return reason;
    };

    DownloadManager.prototype._setupListeners = function () {
        var _this = this;
        this._bridge.on('newDownload', function (identifier, filename, filesize, filehash, locationMetadata) {
            var reason = _this._canDownload();

            if (!reason) {
                var download = _this._downloadFactory.create(filename, filesize, filehash, locationMetadata);

                if (!download) {
                    _this._bridge.emit('end', identifier, 'BAD_METADATA');
                } else {
                    _this._addToActiveDownloads(identifier, download);
                }
            } else {
                _this._bridge.emit('end', identifier, reason);
            }
        });

        this._bridge.on('abortDownload', function (identifier) {
            var activeDownload = _this._activeDownloads[identifier];

            if (activeDownload) {
                activeDownload.manuallyAbort();
            }
        });
    };

    DownloadManager.prototype._addToActiveDownloads = function (identifier, download) {
        var _this = this;
        this._activeDownloads[identifier] = download;

        download.once('abort', function () {
            _this._bridge.emit('manuallyAborted', identifier);
        });

        download.once('requestingFile', function () {
            _this._bridge.emit('requestingFile', identifier);
        });

        download.once('completing', function () {
            _this._bridge.emit('completed', identifier);
        });
    };
    return DownloadManager;
})();

module.exports = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
