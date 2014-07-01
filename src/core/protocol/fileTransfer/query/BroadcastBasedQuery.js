var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

var BroadcastBasedQuery = (function (_super) {
    __extends(BroadcastBasedQuery, _super);
    function BroadcastBasedQuery(searchObjectAsBuffer, transferMessageCenter, circuitManager, broadcastManager, validityNumOfMs) {
        _super.call(this);
        this._queryId = null;
        this._searchObjectAsBuffer = null;
        this._transferMessageCenter = null;
        this._circuitManager = null;
        this._broadcastManager = null;
        this._validityNumOfMs = 0;
        this._validityTimeout = 0;
        this._responseListener = null;
        this._isEnded = false;

        this._searchObjectAsBuffer = searchObjectAsBuffer;
        this._transferMessageCenter = transferMessageCenter;
        this._circuitManager = circuitManager;
        this._validityNumOfMs = validityNumOfMs;
        this._broadcastManager = broadcastManager;

        this._queryId = crypto.pseudoRandomBytes(16).toString('hex');
    }
    BroadcastBasedQuery.prototype.abort = function (abortMessageCode) {
        if (!this._isEnded) {
            this._isEnded = true;

            if (this._validityTimeout) {
                global.clearTimeout(this._validityTimeout);
                this._validityTimeout = 0;
            }

            if (this._responseListener) {
                this._transferMessageCenter.removeListener('QUERY_RESPONSE_' + this._queryId, this._responseListener);
            }

            this.emit('end', abortMessageCode);
        }
    };

    BroadcastBasedQuery.prototype.getQueryId = function () {
        return this._queryId;
    };

    BroadcastBasedQuery.prototype.kickOff = function () {
        var _this = this;
        var queryBroadcastPayload = this._transferMessageCenter.wrapTransferMessage('QUERY_BROADCAST', this._queryId, this._searchObjectAsBuffer);
        var allOkay = false;

        if (queryBroadcastPayload) {
            allOkay = this._circuitManager.pipeFileTransferMessageThroughAllCircuits(queryBroadcastPayload, true);
        }

        if (allOkay) {
            this._broadcastManager.ignoreBroadcastId(this._queryId);

            this._validityTimeout = global.setTimeout(function () {
                _this._validityTimeout = 0;
                _this.abort('COMPL');
            }, this._validityNumOfMs);

            this._responseListener = function () {
                // @todo the correct response listener with the right message type and arguments, and emit the result
            };

            this._transferMessageCenter.on('QUERY_RESPONSE_' + this._queryId, this._responseListener);
        } else {
            this.abort('NOANON');
        }
    };
    return BroadcastBasedQuery;
})(events.EventEmitter);

module.exports = BroadcastBasedQuery;
//# sourceMappingURL=BroadcastBasedQuery.js.map
