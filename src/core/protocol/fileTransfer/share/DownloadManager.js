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
    DownloadManager.prototype._setupListeners = function () {
    };
    return DownloadManager;
})();

module.exports = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
