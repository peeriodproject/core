var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var ReadableMessageFactory = require('./../messages/ReadableMessageFactory');

var MessageByteCheatsheet = require('./../messages/MessageByteCheatsheet');

var IncomingDataPipeline = require('./../messages/IncomingDataPipeline');

/**
* @class core.protocol.ProtocolConnectionManager
*
* @extends events.EventEmitter
* @implements core.protocol.ProtocolConnectionManagerInterface
*
*/
var ProtocolConnectionManager = (function (_super) {
    __extends(ProtocolConnectionManager, _super);
    function ProtocolConnectionManager(config, tcpSocketHandler) {
        var _this = this;
        _super.call(this);
        this._temporaryIdentifierPrefix = '_temp';
        this._temporaryIdentifierCount = 0;
        this._tcpSocketHandler = null;
        this._confirmedSockets = {};
        this._outgoingPendingSockets = {};
        this._incomingPendingSockets = {};
        this._incomingDataPipeline = null;

        this._tcpSocketHandler = tcpSocketHandler;

        this._incomingDataPipeline = new IncomingDataPipeline(config.get('protocol.messages.maxByteLengthPerMessage'), MessageByteCheatsheet.messageEnd, config.get('prococol.messages.msToKeepNonAddressableMemory'), new ReadableMessageFactory());

        this._tcpSocketHandler.on('connected', function (socket, direction) {
            if (direction === 'incoming') {
                _this._onIncomingConnection(socket);
            }
        });
    }
    ProtocolConnectionManager.prototype._onIncomingConnection = function (socket) {
        this._setTemporaryIdentifier(socket);
    };

    ProtocolConnectionManager.prototype._setTemporaryIdentifier = function (socket) {
        socket.setIdentifier(this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount));
    };
    return ProtocolConnectionManager;
})(events.EventEmitter);

module.exports = ProtocolConnectionManager;
//# sourceMappingURL=ProtocolConnectionManager.js.map
