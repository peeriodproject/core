/**
* DownloadManagerInterface implementation.
*
* @class core.protocol.fileTransfer.share.DownloadManager
* @implements core.protocol.fileTransfer.share.DownloadManagerInterface
*
* @param {core.config.ConfigInterface} File transfer configuration
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager Working hydra circuit manager instance
* @param {core.share.DownloadBridgeInterface} downloadBridge Bridge between network and frontend / database handling download issues.
* @oaram {core.protocol.fileTransfer.share.DownloadFactoryInterface} downloadFactory Factory for creating downloads.
*/
var DownloadManager = (function () {
    function DownloadManager(transferConfig, circuitManager, downloadBridge, downloadFactory) {
        /**
        * Stores the currently active downloads under a identifier received from the bridge.
        *
        * @member {core.protocol.fileTransfer.share.DownloadMap} core.protocol.fileTransfer.share.DownloadManager~_activeDownloads
        */
        this._activeDownloads = {};
        /**
        * Stores the download bridge.
        *
        * @member {core.share.DownloadBridgeInterface} core.protocol.fileTransfer.share.DownloadManager~_bridge
        */
        this._bridge = null;
        /**
        * Stores the hydra circuit manager
        *
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.DownloadManager~_circuitManager
        */
        this._circuitManager = null;
        /**
        * Stores the download factory.
        *
        * @member {core.protocol.fileTransfer.share.DownloadFactoryInterface} core.protocol.fileTransfer.share.DownloadManager~_downloadFactory
        */
        this._downloadFactory = null;
        /**
        * Stores the maximum number of parallel downloads a client can have. Populated by config.
        *
        * @member {number} core.protocol.fileTransfer.share.DownloadManager~_maximumNumberOfParallelDownloads
        */
        this._maximumNumberOfParallelDownloads = 0;
        this._downloadFactory = downloadFactory;
        this._bridge = downloadBridge;
        this._maximumNumberOfParallelDownloads = transferConfig.get('fileTransfer.maximumNumberOfParallelDownloads');
        this._circuitManager = circuitManager;

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES
    */
    DownloadManager.prototype.getActiveDownloads = function () {
        return this._activeDownloads;
    };

    DownloadManager.prototype.getMaximumNumberOfDownloads = function () {
        return this._maximumNumberOfParallelDownloads;
    };

    /**
    * END TESTING PURPOSES
    */
    /**
    * Adds a download the the currently active downloads list and binds the event listeners which propagate the
    * download status to the bridge. Note: The event listeners do not need to be unbound, as this is done by the
    * download in its private `_kill` method.
    *
    * @method core.protocol.fileTransfer.share.DownloadManager~_addToActiveDownloads
    *
    * @param {string} identifier The download's identifier received from the bridge.
    * @param {core.protocol.fileTransfer.share.DownloadInterface} download The download to add to the active list.
    */
    DownloadManager.prototype._addToActiveDownloads = function (identifier, download) {
        var _this = this;
        this._activeDownloads[identifier] = download;

        download.once('abort', function () {
            _this._bridge.emit('manuallyAborted', identifier);
        });

        download.once('requestingFile', function () {
            _this._bridge.emit('requestingFile', identifier);
        });

        download.once('startingTransfer', function () {
            _this._bridge.emit('startingTransfer', identifier);
        });

        download.once('completed', function () {
            _this._bridge.emit('completed', identifier);
        });

        download.on('writtenBytes', function (numberOfWrittenBytes, fullCountOfExpectedBytes) {
            _this._bridge.emit('writtenBytes', identifier, numberOfWrittenBytes, fullCountOfExpectedBytes);
        });

        download.once('killed', function (reason) {
            var code = null;

            switch (reason) {
                case 'File cannot be written.':
                    code = 'FS_ERROR';
                    break;
                case 'Manually aborted.':
                    code = 'MANUAL_ABORT';
                    break;
                case 'Uploader aborted transfer.':
                    code = 'REMOTE_ABORT';
                    break;
                case 'Completed.':
                    code = 'COMPLETED';
                    break;
                case 'Maximum tries exhausted.':
                    code = 'TIMED_OUT';
                    break;
                default:
                    if (reason.indexOf('FileBlockWriter') > -1) {
                        code = 'FS_ERROR';
                    } else {
                        code = 'PROTOCOL_ERR';
                    }
            }
            ;

            delete _this._activeDownloads[identifier];

            _this._bridge.emit('end', identifier, code);
        });
    };

    /**
    * Tells if a new download can be started. Requirements: New download may not exceed the maximum number of
    * parallel downloads. Node must maintain at least one hydra circuit.
    *
    * If no new download can be started, a string indicating the reason (which can be propagated to the bridge) is returned,
    * otherwise `null` is returned.
    *
    * @method core.protocol.fileTransfer.share.DownloadManager~_canDownload
    *
    * @returns {string} The reason for not being able to start a new download or `null` if a download can be started.
    */
    DownloadManager.prototype._canDownload = function () {
        var reason = null;

        if (Object.keys(this._activeDownloads).length >= this._maximumNumberOfParallelDownloads) {
            reason = 'MAX_DOWNLOADS_EXCEED';
        } else if (!this._circuitManager.getReadyCircuits().length) {
            reason = 'NO_ANON';
        }

        return reason;
    };

    /**
    * Sets up the listeners on the bridge.
    *
    * @method core.protocol.fielTransfer.share.DownloadManager~_setupListeners
    */
    DownloadManager.prototype._setupListeners = function () {
        var _this = this;
        this._bridge.on('newDownload', function (identifier, filename, filesize, filehash, downloadFolder, locationMetadata) {
            var reason = _this._canDownload();

            if (!reason) {
                var download = _this._downloadFactory.create(downloadFolder, filename, filesize, filehash, locationMetadata);

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
    return DownloadManager;
})();

module.exports = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
