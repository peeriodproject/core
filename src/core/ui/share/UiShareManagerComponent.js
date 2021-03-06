var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var fs = require('fs');
var path = require('path');

var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiShareManagerComponent
* @extends core.ui.UiComponent
*
* @param {core.share.DownloadManagerInterface} downloadManager
*/
var UiShareManagerComponent = (function (_super) {
    __extends(UiShareManagerComponent, _super);
    function UiShareManagerComponent(gui, downloadManager, uploadManager) {
        _super.call(this);
        /**
        * todo ts-definition
        *
        * @member {core.share.DownloadManagerInterface} core.ui.UiShareManagerComponent~_gui
        */
        this._gui = null;
        /**
        * The internally used download manger instance
        *
        * @member {core.share.DownloadManagerInterface} core.ui.UiShareManagerComponent~_downloadManager
        */
        this._downloadManager = null;
        this._progressRunnerTimeout = null;
        this._progressUpdated = null;
        this._runningDownloads = {};
        this._runningUploads = {};
        this._unmergedDownloadsWrittenBytes = {};
        this._uploadManager = null;

        this._gui = gui;
        this._downloadManager = downloadManager;
        this._uploadManager = uploadManager;

        this._setupDownloadManagerEvents();
        this._setupUploadManagerEvents();
        this._setupUiDownloadEvents();
        this._setupUiUploadEvents();
    }
    UiShareManagerComponent.prototype.getEventNames = function () {
        return [
            'addDownload',
            'cancelDownload',
            'cancelUpload',
            'removeDownload',
            'removeUpload',
            'showDownloadDestination',
            'showDownload',
            'updateDownloadDestination'
        ];
    };

    UiShareManagerComponent.prototype.getChannelName = function () {
        return 'share';
    };

    UiShareManagerComponent.prototype.getState = function (callback) {
        var _this = this;
        this._downloadManager.getDownloadDestination(function (err, destination) {
            var share = {
                downloads: _this._runningDownloads,
                uploads: _this._runningUploads,
                destination: {
                    path: destination,
                    error: (err ? { message: err.message, code: 'INVALID_PATH' } : null)
                }
            };

            return callback(share);
        });
    };

    UiShareManagerComponent.prototype._setupDownloadManagerEvents = function () {
        var _this = this;
        this._downloadManager.onDownloadAdded(function (downloadId, fileName, fileSize, fileHash, destination, metadata) {
            _this._runningDownloads[downloadId] = {
                created: new Date().getTime(),
                id: downloadId,
                hash: fileHash,
                loaded: 0,
                name: fileName,
                size: fileSize,
                status: 'CREATED',
                destination: destination
            };

            _this._startProgressRunner();
            _this.updateUi();
        });

        this._downloadManager.onDownloadProgressUpdate(function (downloadId, writtenBytes, fullCountOfExpectedBytes) {
            if (!_this._runningDownloads[downloadId]) {
                return;
            }

            _this._unmergedDownloadsWrittenBytes[downloadId] = writtenBytes;
            _this._progressUpdated = true;

            _this._startProgressRunner();
        });

        this._downloadManager.onDownloadStatusChanged(function (downloadId, status) {
            if (!_this._runningDownloads[downloadId]) {
                return;
            }

            _this._runningDownloads[downloadId].status = status;

            _this.updateUi();
        });

        this._downloadManager.onDownloadEnded(function (downloadId, reason) {
            if (!_this._runningDownloads[downloadId]) {
                return;
            }

            _this._runningDownloads[downloadId].status = reason;

            if (reason === 'COMPLETED') {
                _this._runningDownloads[downloadId].loaded = _this._runningDownloads[downloadId].size;
            }

            _this.updateUi();
        });
    };

    UiShareManagerComponent.prototype._setupUiDownloadEvents = function () {
        var _this = this;
        this.on('addDownload', function (responseId, callback) {
            _this._downloadManager.createDownload(responseId, function (err) {
                // todo clean up error message and add error codes
                var errMessage = err ? err.message : null;

                return callback(errMessage);
            });
        });

        this.on('cancelDownload', function (downloadId) {
            if (_this._runningDownloads[downloadId]) {
                _this._downloadManager.cancelDownload(downloadId);
            }
        });

        this.on('removeDownload', function (downloadId) {
            if (_this._runningDownloads[downloadId]) {
                delete _this._runningDownloads[downloadId];
                delete _this._unmergedDownloadsWrittenBytes[downloadId];

                _this.updateUi();
            }
        });

        this.on('showDownload', function (downloadId) {
            var download = _this._runningDownloads[downloadId];
            var downloadPath = download ? path.join(download.destination, download.name) : null;

            if (!downloadPath) {
                return;
            }

            fs.exists(downloadPath, function (exists) {
                if (exists) {
                    _this._gui.Shell.showItemInFolder(downloadPath);
                }
            });
        });

        this.on('showDownloadDestination', function () {
            _this._downloadManager.getDownloadDestination(function (err, destination) {
                if (!err) {
                    _this._gui.Shell.showItemInFolder(destination);
                }
            });
        });

        this.on('updateDownloadDestination', function (destination) {
            _this._downloadManager.setDownloadDestination(destination, function (err) {
                _this.updateUi();
            });
        });
    };

    UiShareManagerComponent.prototype._setupUiUploadEvents = function () {
        var _this = this;
        this.on('cancelUpload', function (uploadId) {
            if (_this._runningUploads[uploadId]) {
                _this._uploadManager.cancelUpload(uploadId);
            }
        });

        this.on('removeUpload', function (uploadId) {
            if (_this._runningUploads[uploadId]) {
                delete _this._runningUploads[uploadId];

                _this.updateUi();
            }
        });
    };

    UiShareManagerComponent.prototype._setupUploadManagerEvents = function () {
        var _this = this;
        this._uploadManager.onUploadAdded(function (uploadId, filePath, fileName, fileSize) {
            _this._runningUploads[uploadId] = {
                created: new Date().getTime(),
                id: uploadId,
                path: filePath,
                name: fileName,
                size: fileSize,
                status: 'CREATED'
            };

            _this.updateUi();
        });

        this._uploadManager.onUploadStatusChanged(function (uploadId, status) {
            if (!_this._runningUploads[uploadId]) {
                return;
            }

            _this._runningUploads[uploadId].status = status;
            _this.updateUi();
        });

        this._uploadManager.onUploadEnded(function (uploadId, reason) {
            if (!_this._runningUploads[uploadId]) {
                return;
            }

            _this._runningUploads[uploadId].status = reason;

            _this.updateUi();
        });
    };

    UiShareManagerComponent.prototype._startProgressRunner = function () {
        var _this = this;
        if (this._progressRunnerTimeout) {
            return;
        }

        this._progressRunnerTimeout = setTimeout(function () {
            var ids;

            _this._progressRunnerTimeout = null;

            if (!_this._progressUpdated) {
                return;
            }

            ids = Object.keys(_this._unmergedDownloadsWrittenBytes);

            for (var i = 0, l = ids.length; i < l; i++) {
                var id = ids[i];

                _this._runningDownloads[id].loaded = _this._unmergedDownloadsWrittenBytes[id];
            }

            _this._progressUpdated = false;

            _this.updateUi();
            _this._startProgressRunner();
        }, 500); // todo move interval delay to config
    };
    return UiShareManagerComponent;
})(UiComponent);

module.exports = UiShareManagerComponent;
//# sourceMappingURL=UiShareManagerComponent.js.map
