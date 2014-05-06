var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var Id = require('../../topology/Id');

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
        _super.call(this);
        this._temporaryIdentifierPrefix = '_temp';
        this._temporaryIdentifierCount = 0;
        this._tcpSocketHandler = null;
        this._confirmedSockets = {};
        this._outgoingPendingSockets = {};
        this._incomingPendingSockets = {};
        this._incomingDataPipeline = null;
        this._incomingPendingTimeoutLength = 0;

        this._tcpSocketHandler = tcpSocketHandler;

        this._incomingDataPipeline = new IncomingDataPipeline(config.get('protocol.messages.maxByteLengthPerMessage'), MessageByteCheatsheet.messageEnd, config.get('prococol.messages.msToKeepNonAddressableMemory'), new ReadableMessageFactory());

        this._incomingPendingTimeoutLength = config.get('protocol.net.msToWaitForIncomingMessage');

        this._setGlobalListeners();
    }
    ProtocolConnectionManager.prototype._setGlobalListeners = function () {
        var _this = this;
        this._incomingDataPipeline.on('message', function (identifier, message) {
            _this._onMessage(identifier, message);
        });

        this._tcpSocketHandler.on('connected', function (socket, direction) {
            if (direction === 'incoming') {
                _this._onIncomingConnection(socket);
            }
        });
    };

    ProtocolConnectionManager.prototype._onMessage = function (identifier, message) {
        var propagateMessage = true;
        var incomingPending = this._incomingPendingSockets[identifier];

        if (incomingPending) {
            var newIdentifier = this._nodeToIdentifier(message.getSender());
            this._fromIncomingPendingToConfirmed(newIdentifier, identifier, incomingPending);
        } else if (!(this._identifierAndContactNodeMatch(identifier, message.getSender()))) {
            // does not seem to be the person it's supposed to be. we assume something is wrong here
            // and destroy the connection.
            propagateMessage = false;
            this._destroyConnectionByIdentifier(identifier);
        }

        if (propagateMessage) {
            this.emit('message', message);
        }
    };

    ProtocolConnectionManager.prototype._fromIncomingPendingToConfirmed = function (newIdentifier, oldIdentifier, pending) {
        var socket = pending.socket;
        var outgoingPending = this._outgoingPendingSockets[newIdentifier];

        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }
        delete this._incomingPendingSockets[oldIdentifier];

        // check if any outgoing are pending
        if (outgoingPending) {
            outgoingPending.closeAtOnce = true;
        }

        socket.setIdentifier(newIdentifier);

        this._addToConfirmed(newIdentifier, 'incoming', socket);
    };

    ProtocolConnectionManager.prototype._addToConfirmed = function (identifier, direction, socket) {
        var existingSocket = this._confirmedSockets[identifier];
        var newConfirmedSocket = {
            socket: socket,
            direction: direction
        };

        if (existingSocket) {
            if (direction === 'outgoing' && existingSocket.direction === 'incoming') {
                this._destroyConnection(socket, true);
                return;
            } else {
                this._destroyConnection(existingSocket.socket, true);
            }
        }
        this._confirmedSockets[identifier] = newConfirmedSocket;
    };

    ProtocolConnectionManager.prototype._identifierAndContactNodeMatch = function (identifier, node) {
        return identifier === this._nodeToIdentifier(node);
    };

    ProtocolConnectionManager.prototype._nodeToIdentifier = function (node) {
        return node.getId().toHexString();
    };

    ProtocolConnectionManager.prototype._onIncomingConnection = function (socket) {
        var _this = this;
        var identifier = this._setTemporaryIdentifier(socket);
        if (!this._incomingPendingSockets[identifier]) {
            var pending = {
                socket: socket,
                timeout: setTimeout(function () {
                    _this._destroyConnection(socket);
                }, this._incomingPendingTimeoutLength)
            };
            this._incomingPendingSockets[identifier] = pending;
            this._incomingDataPipeline.hookSocket(socket);
        }
    };

    ProtocolConnectionManager.prototype._destroyConnection = function (socket, blockTerminationEvent) {
        var identifier = socket.getIdentifier();
        var incoming = this._incomingPendingSockets[identifier];
        var outgoing = this._outgoingPendingSockets[identifier];
        var confirmed = this._confirmedSockets[identifier];

        this._incomingDataPipeline.unhookSocket(socket);

        if (incoming) {
            if (incoming.timeout) {
                clearTimeout(incoming.timeout);
            }
            delete this._incomingPendingSockets[identifier];
        }
        if (outgoing) {
            delete this._outgoingPendingSockets[identifier];
        }
        if (confirmed) {
            delete this._confirmedSockets[identifier];
        }

        socket.forceDestroy();

        if (!blockTerminationEvent) {
            this._emitTerminatedEventByIdentifier(identifier);
        }
    };

    ProtocolConnectionManager.prototype._emitTerminatedEventByIdentifier = function (identifier) {
        try  {
            var id = new Id(Id.byteBufferByHexString(identifier, 20), 160);
            this.emit('terminatedConnection', id);
        } catch (e) {
        }
    };

    ProtocolConnectionManager.prototype._destroyConnectionByIdentifier = function (identifier) {
        var socket = null;
        var it = ['_incomingPendingSockets', '_outgoingPendingSockets', '_confirmedSockets'];
        for (var i = 0; i < 3; i++) {
            if (socket) {
                break;
            } else {
                var o = this[it[i]][identifier];
                if (o) {
                    socket = o.socket || null;
                }
            }
        }
        if (socket) {
            this._destroyConnection(socket);
        }
    };

    ProtocolConnectionManager.prototype._setTemporaryIdentifier = function (socket) {
        var identifier = this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount);
        socket.setIdentifier(identifier);

        return identifier;
    };
    return ProtocolConnectionManager;
})(events.EventEmitter);

module.exports = ProtocolConnectionManager;
//# sourceMappingURL=ProtocolConnectionManager.js.map
