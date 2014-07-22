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

        this._setupListeners();
    }
    UploadManager.prototype._setupUploadByRequest = function (transferIdentifier, circuitIdOfRequest, requestMessage) {
    };

    UploadManager.prototype._setupListeners = function () {
        var _this = this;
        this._transferMessageCenter.on('SHARE_REQUEST', function (transferIdentifier, circuitIdOfMessage, msgPayload) {
            var requestMessage = _this._readableShareRequestFactory.create(msgPayload);

            if (requestMessage) {
                _this._setupUploadByRequest(transferIdentifier, circuitIdOfMessage, requestMessage);
            }
        });
    };
    return UploadManager;
})();

module.exports = UploadManager;
//# sourceMappingURL=UploadManager.js.map
