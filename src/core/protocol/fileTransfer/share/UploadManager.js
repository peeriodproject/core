var UploadManager = (function () {
    function UploadManager(transferConfig, transferMessageCenter, uploadFactory, readableShareRequestMessageFactory, uploadBridge) {
        this._maximumNumberOfParallelUploads = 0;
        this._transferMessageCenter = null;
        this._uploadFactory = null;
        this._activeUploads = {};
        this._readableShareRequestFactory = null;
        this._bridge = null;
        this._maximumNumberOfParallelUploads = transferConfig.get('fileTransfer.maximumNumberOfParallelUploads');
        this._transferMessageCenter = transferMessageCenter;
        this._uploadFactory = uploadFactory;
        this._readableShareRequestFactory = readableShareRequestMessageFactory;
        this._bridge = uploadBridge;

        this._setupListeners();
    }
    UploadManager.prototype._constructUploadByRequest = function (transferIdentifier, circuitIdOfRequest, requestMessage) {
        var _this = this;
        this._bridge.getFileInfoByHash(requestMessage.getFileHash(), function (err, fullFilePath, filename, filesize) {
            if (!err && fullFilePath) {
                var upload = _this._uploadFactory.create(circuitIdOfRequest, transferIdentifier, requestMessage, fullFilePath, filename, filesize, requestMessage.getFileHash());

                _this._activeUploads[transferIdentifier] = upload;

                upload.once('abort', function () {
                    _this._bridge.emit('manuallyAborted', transferIdentifier);
                });

                upload.once('completed', function () {
                    _this._bridge.emit('completed', transferIdentifier);
                });

                upload.once('ratifyingRequest', function () {
                    _this._bridge.emit('ratifyingRequest', transferIdentifier);
                });

                upload.once('startingUpload', function () {
                    _this._bridge.emit('startingUpload', transferIdentifier);
                });

                upload.on('uploadingBytes', function (numberOfBytes) {
                    _this._bridge.emit('uploadingBytes', transferIdentifier, numberOfBytes);
                });

                upload.once('killed', function (reason) {
                    var code = null;

                    switch (reason) {
                        case 'File cannot be read.':
                            code = 'FS_ERROR';
                            break;
                        case 'Block cannot be read.':
                            code = 'FS_ERROR';
                            break;
                        case 'Manually aborted.':
                            code = 'MANUAL_ABORT';
                            break;
                        case 'Downloader aborted transfer.':
                            code = 'REMOTE_ABORT';
                            break;
                        case 'Completed.':
                            code = 'COMPLETED';
                            break;
                        case 'Maximum tries exhausted.':
                            code = 'TIMED_OUT';
                            break;
                        default:
                            code = 'PROTOCOL_ERR';
                    }
                    ;

                    delete _this._activeUploads[transferIdentifier];

                    _this._bridge.emit('end', transferIdentifier, code);
                });

                _this._bridge.emit('newUpload', transferIdentifier, fullFilePath, filename, filesize);

                upload.kickOff();
            }
        });
    };

    UploadManager.prototype._setupListeners = function () {
        var _this = this;
        this._transferMessageCenter.on('SHARE_REQUEST', function (transferIdentifier, circuitIdOfMessage, msgPayload) {
            if ((Object.keys(_this._activeUploads).length < _this._maximumNumberOfParallelUploads) && !_this._activeUploads[transferIdentifier]) {
                var requestMessage = _this._readableShareRequestFactory.create(msgPayload);

                if (requestMessage) {
                    _this._constructUploadByRequest(transferIdentifier, circuitIdOfMessage, requestMessage);
                }
            }
        });

        this._bridge.on('abortUpload', function (identifier) {
            var activeUpload = _this._activeUploads[identifier];

            if (activeUpload) {
                activeUpload.manuallyAbort();
            }
        });
    };
    return UploadManager;
})();

module.exports = UploadManager;
//# sourceMappingURL=UploadManager.js.map
