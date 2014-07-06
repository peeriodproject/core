var ResponseManager = (function () {
    function ResponseManager(transferMessageCenter, searchBridge, broadcastManager, circuitManager) {
        this._searchBridge = null;
        this._broadcastManager = null;
        this._transferMessageCenter = null;
        this._circuitManager = null;
        this._transferMessageCenter = transferMessageCenter;
        this._searchBridge = searchBridge;
        this._broadcastManager = broadcastManager;
        this._circuitManager = circuitManager;

        this._setupListeners();
    }
    ResponseManager.prototype._setupListeners = function () {
        this._broadcastManager.on('BROADCAST_QUERY', function (broadcastPayload, broadcastId) {
        });
    };
    return ResponseManager;
})();

module.exports = ResponseManager;
//# sourceMappingURL=ResponseManager.js.map
