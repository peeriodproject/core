/**
* UploadManagerInterface implementation.
*
* @class core.protocol.fileTransfer.share.UploadManager
* @implements core.protocol.fileTransfer.share.UploadManagerInterface
*
* @param {core.config.ConfigInterface} transferConfig
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
* @param {core.protocol.fileTransfer.share.UploadFactoryInterface} uploadFactory
* @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface} readableShareRequestFactory
* @param {core.share.UploadBridge} UploadBridgeInterface
*/
var UploadManager = (function () {
    function UploadManager(transferConfig, transferMessageCenter, uploadFactory, readableShareRequestMessageFactory, uploadBridge) {
        /**
        * The list keeping track of the currently active uploads.
        *
        * @member {core.protocol.fileTransfer.share.UploadMap} core.protocol.fileTransfer.share.UploadManager~_activeUploads
        */
        this._activeUploads = {};
        /**
        * @member {core.share.UploadBridge} core.protocol.fileTransfer.share.UploadManager~_bridge
        */
        this._bridge = null;
        /**
        * Propulated by config.
        *
        * @member {number} core.protocol.fileTransfer.share.UploadManager~_maximumNumberOfParallelUploads
        */
        this._maximumNumberOfParallelUploads = 0;
        /**
        * @member {core.protocol.fileTransfer.share.ReadableShareRequestMessageFactoryInterface} core.protocol.fileTransfer.share.UploadManager~_readableShareRequestFactory
        */
        this._readableShareRequestFactory = null;
        /**
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.UploadManager~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * @member {core.protocol.fileTransfer.share.UploadFactoryInterface} core.protocol.fileTransfer.share.UploadManager~_uploadFactory
        */
        this._uploadFactory = null;
        this._maximumNumberOfParallelUploads = transferConfig.get('fileTransfer.maximumNumberOfParallelUploads');
        this._transferMessageCenter = transferMessageCenter;
        this._uploadFactory = uploadFactory;
        this._readableShareRequestFactory = readableShareRequestMessageFactory;
        this._bridge = uploadBridge;

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    UploadManager.prototype.getActiveUploads = function () {
        return this._activeUploads;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    /**
    * Tries to get the file info from the database by the SHA-1 hash provided in the SHARE_REQUEST message.
    * If there is a file, a new upload is created and the correct listeners hooked to the upload, which are then
    * propagated to the bridge.
    *
    * NOTE: Only when an upload is finally killed is it removed from the active list.
    *
    * @method core.protocol.fileTransfer.share.UploadManager~_constructUploadByRequest
    *
    * @param {string} transferIdentifier The transfer identifier of the received SHARE_REQUEST message. This is also used to identify the different uploads.
    * @param {string} circuitIdOfRequest The identifier of the circuit the SHARE_REQUEST message came through. Preferred circuit for SHARE_RATIFY message.
    * @param {core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface} requestMessage The SHARE_REQUEST message
    */
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

    /**
    * Sets up the listeners for the message center's SHARE_REQUEST event and on the bridge's 'abortUpload' event for manually
    * aborting active uploads.
    *
    * @method core.protocol.fileTransfer.share.UploadManager~_setupListeners
    */
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
