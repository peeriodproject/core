/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* @class core.share.UploadBridge
* @extends events.EventEmitter
* @implements core.share.UploadBridgeInterface
*
* @param {core.share.UploadManagerInterface} uploadManager
*/
var UploadBridge = (function (_super) {
    __extends(UploadBridge, _super);
    function UploadBridge(uploadManager) {
        var _this = this;
        _super.call(this);
        this._uploadManager = null;

        this._uploadManager = uploadManager;

        this.on('newUpload', function (uploadId, fullFilePath, fileName, fileSize) {
            _this._uploadManager.createUpload(uploadId, fullFilePath, fileName, fileSize);
        });

        this.on('ratifyingRequest', function (uploadId) {
            _this._uploadManager.updateUploadStatus(uploadId, 'RATIFYING_REQUEST');
        });

        this.on('startingUpload', function (uploadId) {
            _this._uploadManager.updateUploadStatus(uploadId, 'UPLOAD_STARTED');
        });

        this.on('manuallyAborted', function (uploadId) {
            _this._uploadManager.updateUploadStatus(uploadId, 'MANUAL_ABORT');
        });

        this.on('end', function (uploadId, reason) {
            _this._uploadManager.uploadEnded(uploadId, reason);
        });

        this._uploadManager.onUploadCanceled(function (uploadId) {
            _this.emit('abortUpload', uploadId);
        });
    }
    UploadBridge.prototype.getFileInfoByHash = function (fileHash, callback) {
        return this._uploadManager.getFileInfoByHash(fileHash, callback);
    };
    return UploadBridge;
})(events.EventEmitter);

module.exports = UploadBridge;
//# sourceMappingURL=UploadBridge.js.map
