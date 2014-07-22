var UploadManager = (function () {
    function UploadManager(transferConfig, transferMessageCenter, uploadFactory, readableShareRequestMessageFactory) {
        this._maximumNumberOfParallelUploads = 0;
        this._transferMessageCenter = null;
        this._uploadFactory = null;
        this._activeUploads = {};
        this._readableShareRequestFactory = null;
        this._maximumNumberOfParallelUploads = transferConfig.get('fileTransfer.maximumNumberOfParallelUploads');
        this._transferMessageCenter = transferMessageCenter;
        this._uploadFactory = uploadFactory;
        this._readableShareRequestFactory = readableShareRequestMessageFactory;
    }
    return UploadManager;
})();

module.exports = UploadManager;
//# sourceMappingURL=UploadManager.js.map
