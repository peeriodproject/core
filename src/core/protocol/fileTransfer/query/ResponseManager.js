var ResponseManager = (function () {
    function ResponseManager(transferMessageCenter, searchBridge, broadcastManager) {
        this._searchBridge = null;
        this._broadcastManager = null;
        this._transferMessageCenter = null;
        this._transferMessageCenter = transferMessageCenter;
        this._searchBridge = searchBridge;
        this._broadcastManager = broadcastManager;
    }
    return ResponseManager;
})();

module.exports = ResponseManager;
//# sourceMappingURL=ResponseManager.js.map
