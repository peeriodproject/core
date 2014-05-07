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
* ProtocolConnectionManager implementation.
* Detailed structuring is found in the interface comments.
*
* @class core.protocol.ProtocolConnectionManager
* @extends events.EventEmitter
* @implements core.protocol.ProtocolConnectionManagerInterface
*
* @param {core.config.ObjectConfig} config Default configuration
* @param {core.net.tcp.TCPSocketHandlerInterface} Fully bootstrapped TCPSocket handler to use.
*/
var ProtocolConnectionManager = (function (_super) {
    __extends(ProtocolConnectionManager, _super);
    function ProtocolConnectionManager(config, tcpSocketHandler) {
        _super.call(this);
        /**
        * List to keep track of confirmed sockets.
        *
        * @member {core.protocol.net.ConfirmedSocketList} core.protocol.net.ProtocolConnectionManager~_confirmedSockets
        */
        this._confirmedSockets = {};
        /**
        * List to keep track of waiting connections. Stores callbacks, timeouts and an indexing number under
        * one socket identifier.
        *
        * @member {core.protocol.net.WaitForSocketList} core.protocol.net.ProtocolConnectionManager~_connectionWaitingList
        */
        this._connectionWaitingList = {};
        /**
        * The data pipeline sockets get hooked/unhooked to/from.
        *
        * @member {core.protocol.messages.IncomingDataPipelineInterface} core.protocol.net.ProtocolConnectionManager~_incomingDataPipeline
        */
        this._incomingDataPipeline = null;
        /**
        * Stores the incoming sockets which haven't been assigned a valid identifier. Store also a timeout which destroys
        * the socket if it is elapsed and couldn't be assiged an ID.
        *
        * @member {core.protocol.net.IncomingPendingSocketList} core.protocol.net.ProtocolConnectionManager~_incomingPendingSocketList
        */
        this._incomingPendingSockets = {};
        /**
        * Number of milliseconds to wait for a valid message until a non-assignable socket gets destroyed.
        *
        * @member {number} core.protocol.net.ProtocolConnectionManager~_incomingPendingTimeoutLength
        */
        this._incomingPendingTimeoutLength = 0;
        /**
        * List of identifiers whose sockets will not be closed on being idle.
        *
        * @member {string} core.protocol.net.ProtocolConnectionManager~_keepSocketOpenList
        */
        this._keepSocketOpenList = [];
        /**
        * The number of milliseconds to wait for a socket connection to a node until it is marked as unsuccessful.
        *
        * @member {number} core.protocol.net.ProtocolConnectionManager~_msToWaitForConnection
        */
        this._msToWaitForConnection = 0;
        /**
        * List to kee track of outgoing connections. Holds the `closeAtOnce` flag (see interface description).
        *
        * @member {core.protoocol.netOutgoingPendingSocketList} core.protocol.net.ProtocolConnectionManager~_outgoingPendingSocketList
        */
        this._outgoingPendingSockets = {};
        /**
        * The TCP socket handler which passes the sockets and does the networking stuff.
        *
        * @member {core.net.tcp.TCPSocketHandlerInterface} core.protocol.net.ProtocolConnectionManager~_tcpSocketHandler
        */
        this._tcpSocketHandler = null;
        /**
        * Simple number which gets increased everytime to make temporary identifiers unique.
        *
        * @member {number} core.protocol.net.ProtocolConnectionManager~_temporaryIdentifierCount
        */
        this._temporaryIdentifierCount = 0;
        /**
        * Prefix for temporary identifiers on incoming sockets.
        *
        * @member {string} core.protocol.net.ProtocolConnectionManager~_temporaryIdentifierPrefix
        */
        this._temporaryIdentifierPrefix = '_temp';
        /**
        * Simple number which gets increased everytime to make waiting list indices unique.
        *
        * @member {number} core.protocol.net.ProtocolConnectionManager~_waitingListNum
        */
        this._waitingListNum = 0;

        this._tcpSocketHandler = tcpSocketHandler;

        this._incomingDataPipeline = new IncomingDataPipeline(config.get('protocol.messages.maxByteLengthPerMessage'), MessageByteCheatsheet.messageEnd, config.get('prococol.messages.msToKeepNonAddressableMemory'), new ReadableMessageFactory());

        this._incomingPendingTimeoutLength = config.get('protocol.net.msToWaitForIncomingMessage');
        this._msToWaitForConnection = config.get('protocol.net.maxSecondsToWaitForConnection') * 1000;

        this._setGlobalListeners();
    }
    /**
    * Testing purposes only. Should not be used in production.
    *
    * @method {core.protocol.net.ProtocolConnectionManager#getOutgoingPendingSocketList
    *
    * @returns {OutgoingPendingSocketList}
    */
    ProtocolConnectionManager.prototype.getOutgoingPendingSocketList = function () {
        return this._outgoingPendingSockets;
    };

    /**
    * Testing purposes only. Should not be used in production.
    *
    * @method {core.protocol.net.ProtocolConnectionManager#getIncomingPendingSocketList
    *
    * @returns {IncomingPendingSocketList}
    */
    ProtocolConnectionManager.prototype.getIncomingPendingSocketList = function () {
        return this._incomingPendingSockets;
    };

    /**
    * Testing purposes only. Should not be used in production.
    *
    * @method {core.protocol.net.ProtocolConnectionManager#getConfirmedSocketList
    *
    * @returns {ConfirmedSocketList}
    */
    ProtocolConnectionManager.prototype.getConfirmedSocketList = function () {
        return this._confirmedSockets;
    };

    /**
    * Testing purposes only. Should not be used in production.
    *
    * @method {core.protocol.net.ProtocolConnectionManager#getWaitForSocketList
    *
    * @returns {WaitForSocketList}
    */
    ProtocolConnectionManager.prototype.getWaitForSocketList = function () {
        return this._connectionWaitingList;
    };

    ProtocolConnectionManager.prototype.getConfirmedSocketByContactNode = function (node) {
        return this._getConfirmedSocketByIdentifier(this._nodeToIdentifier(node));
    };

    ProtocolConnectionManager.prototype.getConfirmedSocketById = function (id) {
        return this._getConfirmedSocketByIdentifier(id.toHexString());
    };

    ProtocolConnectionManager.prototype.keepSocketsNoLongerOpenFromNode = function (contactNode) {
        var identifier = this._nodeToIdentifier(contactNode);
        var i = this._keepSocketOpenList.indexOf(identifier);

        if (i > -1) {
            var existing = this._confirmedSockets[identifier];
            if (existing) {
                existing.socket.setCloseOnTimeout(true);
            }
            this._keepSocketOpenList.splice(i, 1);
        }
    };

    ProtocolConnectionManager.prototype.keepSocketsOpenFromNode = function (contactNode) {
        var identifier = this._nodeToIdentifier(contactNode);

        if (this._keepSocketOpenList.indexOf(identifier) > -1) {
            return;
        } else {
            this._keepSocketOpenList.push(identifier);
            var existing = this._confirmedSockets[identifier];
            if (existing) {
                existing.socket.setCloseOnTimeout(false);
            }
        }
    };

    ProtocolConnectionManager.prototype.obtainConnectionTo = function (node, callback) {
        var identifier = this._nodeToIdentifier(node);
        var existing = this._getConfirmedSocketByIdentifier(identifier);

        if (existing) {
            callback(null, existing);
        } else {
            this._addToWaitingList(identifier, callback);
            this._initiateOutgoingConnection(node);
        }
    };

    ProtocolConnectionManager.prototype.writeBufferTo = function (node, buffer, callback) {
        this.obtainConnectionTo(node, function (err, socket) {
            if (err) {
                if (callback) {
                    callback(err);
                }
            } else {
                socket.writeBuffer(buffer, function () {
                    if (callback) {
                        callback(null);
                    }
                });
            }
        });
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

        this._hookDestroyOnCloseToSocket(socket);

        if (this._keepSocketOpenList.indexOf(identifier) > -1) {
            socket.setCloseOnTimeout(false);
        }

        this._confirmedSockets[identifier] = newConfirmedSocket;

        this.emit('confirmedSocket', identifier, socket);
    };

    ProtocolConnectionManager.prototype._addToWaitingList = function (identifier, callback) {
        var existing = this._connectionWaitingList[identifier];
        var index = ++this._waitingListNum;

        var waitFor = {
            index: index,
            callback: callback,
            timeout: this._getConnectionWaitingListTimeout(identifier, index)
        };

        if (!existing) {
            this._connectionWaitingList[identifier] = [];
        }

        this._connectionWaitingList[identifier].push(waitFor);
    };

    ProtocolConnectionManager.prototype._callbackWaitingConnection = function (identifier, index, err, sock) {
        var list = this._connectionWaitingList[identifier];
        var item = null;
        var _i = 0;
        var retVal = null;

        for (var i = 0; i < list.length; i++) {
            if (list[i].index === index) {
                item = list[i];
                _i = i;
                break;
            }
        }

        if (item) {
            item.callback(err, sock);
            retVal = this._connectionWaitingList[identifier].splice(_i, 1)[0];
            if (this._connectionWaitingList[identifier].length === 0) {
                delete this._connectionWaitingList[identifier];
            }
        }

        return retVal;
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

        if (confirmed && !blockTerminationEvent) {
            this._emitTerminatedEventByIdentifier(identifier);
        }
    };

    ProtocolConnectionManager.prototype._destroyConnectionByIdentifier = function (identifier) {
        var socket = null;
        var it = ['_incomingPendingSockets', '_confirmedSockets'];
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

    ProtocolConnectionManager.prototype._emitTerminatedEventByIdentifier = function (identifier) {
        try  {
            var id = new Id(Id.byteBufferByHexString(identifier, 20), 160);
            this.emit('terminatedConnection', id);
        } catch (e) {
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

    ProtocolConnectionManager.prototype._getConfirmedSocketByIdentifier = function (identifier) {
        var existing = this._confirmedSockets[identifier];
        if (existing) {
            return existing.socket;
        }
        return null;
    };

    ProtocolConnectionManager.prototype._getConnectionWaitingListTimeout = function (identifier, index) {
        var _this = this;
        return setTimeout(function () {
            _this._callbackWaitingConnection(identifier, index, new Error('ProtocolConnectionManager: Unable to obtain connection to ' + identifier), null);
        }, this._msToWaitForConnection);
    };

    ProtocolConnectionManager.prototype._hookDestroyOnCloseToSocket = function (socket) {
        var _this = this;
        // remote close
        socket.on('close', function () {
            _this._destroyConnection(socket);
        });
    };

    ProtocolConnectionManager.prototype._identifierAndContactNodeMatch = function (identifier, node) {
        return identifier === this._nodeToIdentifier(node);
    };

    ProtocolConnectionManager.prototype._initiateOutgoingConnection = function (contactNode) {
        var _this = this;
        var identifier = this._nodeToIdentifier(contactNode);

        if (!this._outgoingPendingSockets[identifier]) {
            var outgoingEntry = {
                closeAtOnce: false
            };

            this._outgoingPendingSockets[identifier] = outgoingEntry;

            this._tryToOutgoingConnectToNode(contactNode, function (socket) {
                if (socket) {
                    if (outgoingEntry.closeAtOnce) {
                        socket.forceDestroy();
                    } else {
                        socket.setIdentifier(identifier);
                        _this._incomingDataPipeline.hookSocket(socket);
                        _this._addToConfirmed(identifier, 'outgoing', socket);
                    }
                }
                delete _this._outgoingPendingSockets[identifier];
            });
        }
    };

    ProtocolConnectionManager.prototype._nodeToIdentifier = function (node) {
        return node.getId().toHexString();
    };

    ProtocolConnectionManager.prototype._onConfirmedSocket = function (identifier, socket) {
        var waiting = this._connectionWaitingList[identifier];
        if (waiting) {
            for (var i = 0; i < waiting.length; i++) {
                var item = waiting[i];
                clearTimeout(item.timeout);
                item.callback(null, socket);
            }

            delete this._connectionWaitingList[identifier];
        }
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

        this.on('confirmedSocket', this._onConfirmedSocket);
    };

    ProtocolConnectionManager.prototype._setTemporaryIdentifier = function (socket) {
        var identifier = this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount);
        socket.setIdentifier(identifier);

        return identifier;
    };

    ProtocolConnectionManager.prototype._tryToOutgoingConnectToNode = function (contactNode, callback) {
        var addresses = contactNode.getAddresses();
        var startAt = 0;
        var maxIndex = addresses.length - 1;
        var tcpSocketHandler = this._tcpSocketHandler;

        var connectToAddressByIndex = function (i, callback) {
            var address = address[i];
            tcpSocketHandler.connectTo(address.getPort(), address.getIp(), callback);
        };
        var theCallback = function (socket) {
            if (!socket) {
                if (++startAt <= maxIndex) {
                    connectToAddressByIndex(startAt, theCallback);
                }
            } else {
                callback(socket);
            }
        };

        connectToAddressByIndex(startAt, theCallback);
    };
    return ProtocolConnectionManager;
})(events.EventEmitter);

module.exports = ProtocolConnectionManager;
//# sourceMappingURL=ProtocolConnectionManager.js.map
