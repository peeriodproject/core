/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var DownloadBridge = (function (_super) {
    __extends(DownloadBridge, _super);
    function DownloadBridge(downloadManager) {
        var _this = this;
        _super.call(this);

        downloadManager.onDownloadAdded(function (downloadId, fileName, fileSize, fileHash, destination, metadata) {
            _this.emit('newDownload', downloadId, fileName, fileSize, fileHash, destination, metadata);
        });

        downloadManager.onDownloadCanceled(function (downloadId) {
            _this.emit('abortDownload', downloadId);
        });

        // - - -
        this.on('writtenBytes', function (downloadId, numberOfWrittenBytes, fullCountOfExpectedBytes) {
            downloadManager.updateDownloadProgress(downloadId, numberOfWrittenBytes, fullCountOfExpectedBytes);
        });

        this.on('requestingFile', function (downloadId) {
            downloadManager.updateDownloadStatus(downloadId, 'REQUESTING_FILE');
        });

        this.on('startingTransfer', function (downloadId) {
            downloadManager.updateDownloadStatus(downloadId, 'TRANSFER_STARTED');
        });

        this.on('completed', function (downloadId) {
            downloadManager.updateDownloadStatus(downloadId, 'COMPLETED');
        });

        this.on('manuallyAborted', function (downloadId) {
            downloadManager.updateDownloadStatus(downloadId, 'MANUAL_ABORT');
        });

        this.on('end', function (downloadId, reason) {
            downloadManager.downloadEnded(downloadId, reason);
        });
    }
    return DownloadBridge;
})(events.EventEmitter);

module.exports = DownloadBridge;
//# sourceMappingURL=DownloadBridge.js.map
