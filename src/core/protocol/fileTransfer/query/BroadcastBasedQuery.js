var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

var logger = require('../../../utils/logger/LoggerFactory').create();

/**
* QueryInterface implementation based on broadcast.
* Lets the broadcast manager ignore the generated query identifier.
*
* @class core.protocol.fileTransfer.BroadcastBasedQuery
* @extends events.EventEmitter
* @implements core.protocol.fileTransfer.QueryInterface
*
* @param {Buffer} searchObjectAsBuffer The object to search for in its byte buffer representation.
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} A working transfer message center instance.
* @param {core.protocol.hydra.CircuitManagerInterface} The hydra circuit manager used to pipe the messages through.
* @oaram {core.protocol.broadcast.BroadcastManagerInterface} A working protocol broadcast manager instance.
* @param {number} validityNumOfMs The number of milliseconds a query should live and wait for responses before being aborted.
*/
var BroadcastBasedQuery = (function (_super) {
    __extends(BroadcastBasedQuery, _super);
    function BroadcastBasedQuery(searchObjectAsBuffer, transferMessageCenter, circuitManager, broadcastManager, validityNumOfMs) {
        _super.call(this);
        /**
        * Stores the broadcast manager instance.
        *
        * @member {core.protocol.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.BroadcastBasedQuery~_broadcastManager
        */
        this._broadcastManager = null;
        /**
        * Stores the hydra circuit manager instance.
        *
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.BroadcastBasedQuery~_circuitManager
        */
        this._circuitManager = null;
        /**
        * Flag indicating whether this query has already been ended.
        *
        * @member {boolean} core.protocol.fileTransfer.BroadcastBasedQuery~_isEnded
        */
        this._isEnded = false;
        /**
        * The 16 byte long query identifier.
        *
        * @member {string} core.protocol.fileTransfer.BroadcastBasedQuery~_queryId
        */
        this._queryId = null;
        /**
        * Stores the listener function on the QUERY_RESPONSE event hooked to the transfer message center.
        *
        * @member {Function} core.protocol.fileTransfer.BroadcastBasedQuery~_responseListener
        */
        this._responseListener = null;
        /**
        * The object searched for.
        *
        * @member {Buffer} core.protocol.fileTransfer.BroadcastBasedQuery~_searchObjectAsBuffer
        */
        this._searchObjectAsBuffer = null;
        /**
        * Stores the transfer message center instance.
        *
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.BroadcastBasedQuery~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * The number of milliseconds the query is valid and waits for responses.
        *
        * @member {number} core.protocol.fileTransfer.BroadcastBasedQuery~_validityNumOfMs
        */
        this._validityNumOfMs = 0;
        /**
        * Stores the timeout issued when the query has been sent through the circuits.
        *
        * @member {number|NodeJS.Timer} core.protocol.fileTransfer.BroadcastBasedQuery~_validityTimeout
        */
        this._validityTimeout = 0;

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
            logger.log('query', 'Piped query broadcast issuing through all circuits', { allOkay: allOkay });
        }

        if (allOkay) {
            this._broadcastManager.ignoreBroadcastId(this._queryId);

            this._validityTimeout = global.setTimeout(function () {
                _this._validityTimeout = 0;
                _this.abort('COMPLETE');
            }, this._validityNumOfMs);

            this._responseListener = function (message) {
                _this.emit('result', message.getFeedingNodes(), message.getResponseBuffer());
            };

            this._transferMessageCenter.on('QUERY_RESPONSE_' + this._queryId, this._responseListener);
        } else {
            this.abort('NO_ANON');
        }
    };
    return BroadcastBasedQuery;
})(events.EventEmitter);

module.exports = BroadcastBasedQuery;
//# sourceMappingURL=BroadcastBasedQuery.js.map
