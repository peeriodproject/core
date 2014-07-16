var ShareMessenger = (function () {
    function ShareMessenger(fileTransferConfig, circuitManager, transferMessageCenter) {
        this._circuitManager = null;
        this._transferMessageCenter = null;
        this._maximumNumberOfMessageTries = 0;
        this._waitForResponseMessageInMs = 0;
        this._canPipeNewMessage = false;
        this._waitForResponseTimeout = 0;
        this._currentMessageListener = null;
        this._currentMessageListenerKey = null;
        this._messageReceivedThroughCircuitId = null;
        this._retryCount = 0;
        this._hasResponded = false;
        this._currentCallback = null;
        this._circuitManager = circuitManager;
        this._transferMessageCenter = transferMessageCenter;
        this._maximumNumberOfMessageTries = fileTransferConfig.get('fileTransfer.shareMessaging.maximumNumberOfMessageTries');
        this._waitForResponseMessageInMs = fileTransferConfig.get('fileTransfer.shareMessaging.waitForResponseMessageInSeconds') * 1000;

        this._canPipeNewMessage = true;
    }
    ShareMessenger.prototype.pipeMessageAndWaitForResponse = function (payloadToFeed, nodesToFeedBlock, expectedMessageType, expectedTransferIdentifier, callback) {
        var _this = this;
        if (!this._canPipeNewMessage) {
            process.nextTick(function () {
                callback(new Error('ShareMessenger: Cannot pipe message, still waiting for response.'), null);
            });
            return;
        }

        this._canPipeNewMessage = false;
        this._hasResponded = false;
        this._currentCallback = callback;

        this._currentMessageListenerKey = expectedMessageType + '_' + expectedTransferIdentifier;
        this._currentMessageListener = function (circuitId, responseMessagePayload) {
            _this._hasResponded = true;
            _this._messageReceivedThroughCircuitId = circuitId;
            _this._currentMessageListener = null;
            _this._currentMessageListenerKey = null;

            if (_this._waitForResponseTimeout) {
                global.clearTimeout(_this._waitForResponseTimeout);
                _this._waitForResponseTimeout = 0;
            }

            _this._doCallback(null, responseMessagePayload);
        };

        this._transferMessageCenter.once(this._currentMessageListenerKey, this._currentMessageListener);

        this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed);
    };

    ShareMessenger.prototype.pipeLastMessage = function (payloadToFeed, nodesToFeedBlock) {
        var _this = this;
        if (!this._canPipeNewMessage) {
            throw new Error('ShareMessenger: Cannot pipe message, still waiting for another response.');
        }

        this._canPipeNewMessage = false;

        if (!this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed, this._messageReceivedThroughCircuitId)) {
            this._circuitManager.once('circuitCount', function () {
                _this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed);
            });
        }
    };

    ShareMessenger.prototype.teardownLatestCircuit = function () {
        if (this._messageReceivedThroughCircuitId) {
            this._circuitManager.teardownCircuit(this._messageReceivedThroughCircuitId);
            this._messageReceivedThroughCircuitId = null;
        }
    };

    ShareMessenger.prototype._issueFeedAndSetTimeout = function (nodesToFeedBlock, payloadToFeed, skipCircuitListener) {
        var _this = this;
        if (typeof skipCircuitListener === "undefined") { skipCircuitListener = false; }
        var success = this._transferMessageCenter.issueExternalFeedToCircuit(nodesToFeedBlock, payloadToFeed, this._messageReceivedThroughCircuitId);

        if (success) {
            this._waitForResponseTimeout = global.setTimeout(function () {
                if (!_this._hasResponded) {
                    _this._increaseRetryCountAndIssueAgain(nodesToFeedBlock, payloadToFeed);
                }
                _this._waitForResponseTimeout = 0;
            }, this._waitForResponseMessageInMs);
        } else {
            if (!skipCircuitListener) {
                this._circuitManager.once('circuitCount', function () {
                    if (!_this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed, true)) {
                        _this._doCallback(new Error('Maximum tries exhausted.'), null);
                    }
                });
            }
        }

        return success;
    };

    ShareMessenger.prototype._increaseRetryCountAndIssueAgain = function (nodesToFeedBlock, payloadToFeed) {
        this._retryCount++;
        if (this._retryCount <= this._maximumNumberOfMessageTries) {
            this._issueFeedAndSetTimeout(nodesToFeedBlock, payloadToFeed);
        } else {
            this._doCallback(new Error('Maximum tries exhausted.'), null);
        }
    };

    ShareMessenger.prototype._doCallback = function (err, responseMessagePayload) {
        if (this._currentCallback) {
            var cb = this._currentCallback;

            if (this._currentMessageListener) {
                this._transferMessageCenter.removeListener(this._currentMessageListenerKey, this._currentMessageListener);
                this._currentMessageListener = null;
                this._currentMessageListenerKey = null;
            }

            this._currentCallback = null;
            this._canPipeNewMessage = true;

            cb(err, responseMessagePayload);
        }
    };
    return ShareMessenger;
})();

module.exports = ShareMessenger;
//# sourceMappingURL=ShareMessenger.js.map
