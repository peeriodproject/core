var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var Id = require('../../topology/Id');

var ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');

var ReadableMessageFactory = require('./../messages/ReadableMessageFactory');

var MessageByteCheatsheet = require('./../messages/MessageByteCheatsheet');

var IncomingDataPipeline = require('./../messages/IncomingDataPipeline');

var GeneralWritableMessageFactory = require('./../messages/GeneralWritableMessageFactory');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
* ProtocolConnectionManager implementation.
* Detailed structuring is found in the interface comments.
*
* @class core.protocol.ProtocolConnectionManager
* @extends events.EventEmitter
* @implements core.protocol.ProtocolConnectionManagerInterface
*
* @param {core.config.ObjectConfig} config Default configuration
* @param {core.topology.MyNodeInterface} myNode My node.
* @param {core.net.tcp.TCPSocketHandlerInterface} Fully bootstrapped TCPSocket handler to use.
*/
var ProtocolConnectionManager = (function (_super) {
    __extends(ProtocolConnectionManager, _super);
    function ProtocolConnectionManager(config, myNode, tcpSocketHandler) {
        _super.call(this);
        /**
        * Contact node address factory.
        *
        * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.net.ProtocolConnectionManager~_addressFactory
        */
        this._addressFactory = null;
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
        * The writable message factory used for creating messages.
        *
        * @member {core.protocol.messages.GeneralWritableMessageFactoryInterface} core.protocol.net.ProtocolConnectionManager~_generalWritableMessageFactory
        */
        this._generalWritableMessageFactory = null;
        /**
        * Simple number which gets increased everytime to make hydra identifiers unique.
        *
        * @member {number} core.protocol.net.ProtocolConnectionManager~_hydraIdentifierCount
        */
        this._hydraIdentifierCount = 0;
        /**
        * Prefix for hydra identifiers on incoming and outgoing sockets.
        *
        * @member {string} core.protocol.net.ProtocolConnectionManager~_hydraIdentifierPrefix
        */
        this._hydraIdentifierPrefix = '_hydra';
        /**
        * List to keep track of hydra sockets. Merely stores tcp socket under the identifier.
        *
        * @member {core.protocol.net.HydraSocketList} core.protocol.net.ProtocolConnectionManager~_hydraSockets
        */
        this._hydraSockets = {};
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
        * My node. Used for generating outgoing messages.
        *
        * @member {core.topology.MyNodeInterface} core.protocol.net.ProtocolConnectionManager~_myNode
        */
        this._myNode = null;
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

        this._myNode = myNode;

        this._generalWritableMessageFactory = new GeneralWritableMessageFactory(this._myNode);
        this._tcpSocketHandler = tcpSocketHandler;

        this._addressFactory = new ContactNodeAddressFactory();

        if (!this._myNode.getAddresses()) {
            this._myNode.updateAddresses(this.getExternalAddressList(), 'initially');
        }

        this._incomingDataPipeline = new IncomingDataPipeline(config.get('protocol.messages.maxByteLengthPerMessage'), MessageByteCheatsheet.messageEnd, config.get('protocol.messages.msToKeepNonAddressableMemory'), new ReadableMessageFactory());

        this._incomingPendingTimeoutLength = config.get('protocol.messages.msToWaitForIncomingMessage');
        this._msToWaitForConnection = config.get('protocol.messages.maxSecondsToWaitForConnection') * 1000;

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

    ProtocolConnectionManager.prototype.getExternalAddressList = function () {
        var openPorts = this._tcpSocketHandler.getOpenServerPortsArray();
        var externalIp = this._tcpSocketHandler.getMyExternalIp();
        var externalAddressList = [];

        for (var i = 0; i < openPorts.length; i++) {
            externalAddressList.push(this._addressFactory.create(externalIp, openPorts[i]));
        }

        return externalAddressList;
    };

    ProtocolConnectionManager.prototype.getMyNode = function () {
        return this._myNode;
    };

    ProtocolConnectionManager.prototype.getRandomExternalIpPortPair = function () {
        var openPorts = this._tcpSocketHandler.getOpenServerPortsArray();
        var externalIp = this._tcpSocketHandler.getMyExternalIp();

        if (openPorts.length && externalIp) {
            return {
                ip: externalIp,
                port: openPorts[Math.floor(Math.random() * openPorts.length)]
            };
        } else {
            return null;
        }
    };

    /**
    * Testing purposes only. Should not be used in production.
    *
    * @method {core.protocol.net.ProtocolConnectionManager#getHydraSocketList
    *
    * @returns {core.protocol.net.HydraSocketList}
    */
    ProtocolConnectionManager.prototype.getHydraSocketList = function () {
        return this._hydraSockets;
    };

    /**
    * Testing purposes only. Should not be used in production.
    *
    * @method {core.protocol.net.ProtocolConnectionManager#getConfirmedSocketList
    *
    * @returns {Array<string>}
    */
    ProtocolConnectionManager.prototype.getKeepOpenList = function () {
        return this._keepSocketOpenList;
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

    ProtocolConnectionManager.prototype.closeHydraSocket = function (identifier) {
        var socket = this._hydraSockets[identifier];

        if (socket) {
            socket.end();
        }
    };

    ProtocolConnectionManager.prototype.getConfirmedSocketByContactNode = function (node) {
        return this._getConfirmedSocketByIdentifier(this._nodeToIdentifier(node));
    };

    ProtocolConnectionManager.prototype.getConfirmedSocketById = function (id) {
        return this._getConfirmedSocketByIdentifier(id.toHexString());
    };

    ProtocolConnectionManager.prototype.forceMessageThroughPipe = function (originalSender, rawBuffer) {
        var msg = this._incomingDataPipeline.deformatBuffer(rawBuffer);
        if (msg) {
            if (msg.isHydra() || !msg.getReceiverId().equals(this._myNode.getId())) {
                this._destroyConnectionByIdentifier(this._nodeToIdentifier(originalSender));
            } else {
                this.emit('message', msg);
            }
        }
    };

    ProtocolConnectionManager.prototype.getHydraSocketIp = function (identifier) {
        var socket = this._hydraSockets[identifier];

        if (socket) {
            return socket.getIP();
        }

        return undefined;
    };

    ProtocolConnectionManager.prototype.hydraConnectTo = function (port, ip, callback) {
        var _this = this;
        this._tcpSocketHandler.connectTo(port, ip, function (socket) {
            if (socket) {
                var identifier = _this._setHydraIdentifier(socket);

                _this._incomingDataPipeline.hookSocket(socket);
                _this._addToHydra(identifier, socket);

                callback(null, identifier);
            } else {
                callback(new Error('Could not establish connection to [' + ip + ']:' + port), null);
            }
        });
    };

    ProtocolConnectionManager.prototype.hydraWriteBufferTo = function (identifier, buffer, callback) {
        var socket = this._hydraSockets[identifier];

        if (!socket) {
            if (callback) {
                callback(new Error('ProtocolConnectionManager#hydraWriteBufferTo: No socket stored under this identifier.'));
            }
        } else {
            socket.writeBuffer(buffer, function () {
                if (callback) {
                    callback(null);
                }
            });
        }
    };

    ProtocolConnectionManager.prototype.hydraWriteMessageTo = function (identifier, payload, callback) {
        var buffer = this._generalWritableMessageFactory.hydraConstructMessage(payload, payload.length);
        this.hydraWriteBufferTo(identifier, buffer, callback);
    };

    ProtocolConnectionManager.prototype.keepHydraSocketNoLongerOpen = function (identifier) {
        var socket = this._hydraSockets[identifier];

        if (socket) {
            socket.setKeepOpen(false);
        }
    };

    ProtocolConnectionManager.prototype.invalidateOutgoingConnectionsTo = function (node) {
        var identifier = this._nodeToIdentifier(node);
        var outgoingPending = this._outgoingPendingSockets[identifier];
        var confirmed = this._confirmedSockets[identifier];

        if (outgoingPending) {
            outgoingPending.closeAtOnce = true;
        } else if (confirmed && confirmed.direction === 'outgoing') {
            this._destroyConnection(confirmed.socket);
        }
    };

    ProtocolConnectionManager.prototype.keepHydraSocketOpen = function (identifier) {
        var socket = this._hydraSockets[identifier];

        if (socket) {
            socket.setKeepOpen(true);
        }
    };

    ProtocolConnectionManager.prototype.keepSocketsNoLongerOpenFromNode = function (contactNode) {
        var identifier = this._nodeToIdentifier(contactNode);
        var i = this._keepSocketOpenList.indexOf(identifier);

        if (i > -1) {
            var existing = this._confirmedSockets[identifier];
            if (existing) {
                existing.socket.setKeepOpen(false);
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
                existing.socket.setKeepOpen(true);
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
                    buffer = null;
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

    ProtocolConnectionManager.prototype.writeMessageTo = function (node, messageType, payload, callback) {
        this._generalWritableMessageFactory.setReceiver(node);
        this._generalWritableMessageFactory.setMessageType(messageType);
        var buffer = this._generalWritableMessageFactory.constructMessage(payload, payload.length);

        this.writeBufferTo(node, buffer, callback);

        // testing purposes only
        var payloadStr = messageType === 'FIND_CLOSEST_NODES' ? payload.toString('hex') : '';

        logger.log('message', '', { to: node.getId().toHexString(), msgType: messageType, payload: payloadStr, myId: this._myNode.getId().toHexString() });
    };

    /**
    * Adds a TCP socket to the confirmed list. Hooks an event to it that it gets destroyed when it's closed.
    * Replaces old socket on same identifier, except when the new one is outgoing and the old one is incoming.
    * Keeps it open when needed.
    * Emits a `confirmedSocket` event in the end.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_addToConfirmed
    *
    * @param {string} identifier
    * @param {string} direction 'incoming' or 'outgoing'
    * @param {core.net.tcp.TCPSocketInterface} socket
    */
    ProtocolConnectionManager.prototype._addToConfirmed = function (identifier, direction, socket) {
        var _this = this;
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
            socket.setKeepOpen(true);
        }

        this._confirmedSockets[identifier] = newConfirmedSocket;

        process.nextTick(function () {
            _this.emit('confirmedSocket', identifier, socket);
        });
    };

    /**
    * Adds a TCP socket to the hydra list. Hooks an event to it that it gets destroyed when it's closed.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_addToHydra
    *
    * @param {string} identifier
    * @param {core.net.tcp.TCPSocketInterface} socket
    */
    ProtocolConnectionManager.prototype._addToHydra = function (identifier, socket) {
        var _this = this;
        this._hookDestroyOnCloseToSocket(socket);
        this._hydraSockets[identifier] = socket;

        process.nextTick(function () {
            _this.emit('hydraSocket', identifier, socket);
        });
    };

    /**
    * Adds a callback to the 'waiting for socket' list. Provides it with an index and a timeout (which destroys
    * the waiting entry and calls the callback with `null`).
    *
    * @method core.protocol.net.ProtocolConnectionManager~_addToWaitingList
    *
    * @param {string} identifier
    * @param {Function} callback The callback which should get called when the socket is there / an error occurs. Called with error and socket as arguments.
    */
    ProtocolConnectionManager.prototype._addToWaitingList = function (identifier, callback) {
        var existing = this._connectionWaitingList[identifier];
        var index = ++this._waitingListNum;

        var waitFor = {
            index: index,
            callback: callback,
            timeout: this._createConnectionWaitingListTimeout(identifier, index)
        };

        if (!existing) {
            this._connectionWaitingList[identifier] = [];
        }

        this._connectionWaitingList[identifier].push(waitFor);
    };

    /**
    * Finds a specific waiting entry in the connection waiting list and calls its callback as well as removing it
    * from the array. Does not, however, clear the timeout (must be done manually).
    *
    * @method core.protocol.net.ProtocolConnectionManager~_callbackWaitingConnection
    *
    * @param {string} identifier Identifier under which to find the entry
    * @param {string} index The index of the WaitForSocket item
    * @param {Error} err Error paramter for the callback
    * @param {TCPSocketInterface} sock Socket parameter for the callback
    * @returns {WaitForSocket} The removed WaitForSocket entry
    */
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
            retVal = this._connectionWaitingList[identifier].splice(_i, 1)[0];
            if (this._connectionWaitingList[identifier].length === 0) {
                delete this._connectionWaitingList[identifier];
            }
            item.callback(err, sock);
        }

        return retVal;
    };

    /**
    * Creates a timeout for the connection waiting list. When it elapses, the callback stored next to it
    * will be emitted with an error stating it was unable to obtain a successful connection.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_createConnectionWaitingListTimeout
    *
    * @param {string} identifier
    * @param {number} index Index of the WaitForSocket-item stored in the array under the identifier
    * @returns {number|NodeJS.Timer}
    */
    ProtocolConnectionManager.prototype._createConnectionWaitingListTimeout = function (identifier, index) {
        var _this = this;
        return global.setTimeout(function () {
            _this._callbackWaitingConnection(identifier, index, new Error('ProtocolConnectionManager: Unable to obtain connection to ' + identifier), null);
        }, this._msToWaitForConnection);
    };

    /**
    * Destroys a socket connection. Removes all references within the manager, clears any incmoing pending timeouts.
    * unhooks it from the data pipeline and force destroys the socket itself (removing all listeners and dumping the reference).
    * Emits a `terminatedConnection` event if the socket was a confirmed one and the event should not be blocked.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_destroyConnection
    *
    * @param {core.net.tcp.TCPSocketInterface} socket The socket to destroy
    * @param {boolean} blockTerminationEvent Indicates whether a `terminatedConnection` event should be blocked or not.
    * @param {boolean} avoidEnd Indicates whether the socket should be ended or not, e.g. already closed sockets
    */
    ProtocolConnectionManager.prototype._destroyConnection = function (socket, blockTerminationEvent) {
        var identifier = socket.getIdentifier();
        var incoming = this._incomingPendingSockets[identifier];
        var outgoing = this._outgoingPendingSockets[identifier];
        var confirmed = this._confirmedSockets[identifier];
        var hydra = this._hydraSockets[identifier];

        this._incomingDataPipeline.unhookSocket(socket);

        if (incoming) {
            if (incoming.timeout) {
                global.clearTimeout(incoming.timeout);
                incoming.timeout = null;
            }
            delete this._incomingPendingSockets[identifier];
        }
        if (outgoing) {
            delete this._outgoingPendingSockets[identifier];
        }
        if (confirmed) {
            delete this._confirmedSockets[identifier];
        }
        if (hydra) {
            delete this._hydraSockets[identifier];
        }

        socket.end();

        socket = null;

        if ((confirmed || hydra) && !blockTerminationEvent) {
            this._emitTerminatedEventByIdentifier(identifier);
        }
    };

    /**
    * Looks for a socket entry in the incoming pending list and in the confirmed list. If one is found, it is destroyed.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_destroyConnectionByIdentifier
    *
    * @param {string} identifier
    */
    ProtocolConnectionManager.prototype._destroyConnectionByIdentifier = function (identifier) {
        var socket = null;
        var it = ['_incomingPendingSockets', '_confirmedSockets', '_hydraSockets'];
        for (var i = 0; i < 3; i++) {
            if (socket) {
                break;
            } else {
                var t = it[i];
                var o = this[t][identifier];
                if (o) {
                    socket = (t === '_hydraSockets') ? o : (o.socket || null);
                }
            }
        }
        if (socket) {
            this._destroyConnection(socket);
        }
    };

    /**
    * Tries to emit a `terminatedConnection`-event by making a valid ID out of the hexadecimal-string-identifier.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_emitTerminatedEventByIdentifier
    *
    * @param {string} identifier
    */
    ProtocolConnectionManager.prototype._emitTerminatedEventByIdentifier = function (identifier) {
        try  {
            var id = new Id(Id.byteBufferByHexString(identifier, 20), 160);
            this.emit('terminatedConnection', id);
        } catch (e) {
            this.emit('terminatedConnection', identifier);
        }
    };

    /**
    * Moves a socket from the incoming pending list to the confirmed list. Provides the socket with the new identifier
    * and checks if there are any outgoing pending connections under the same one. If yes, they are marked with the
    * `closeAtOnce` flag.
    * Calls `_addToConfirmed` in the end.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_fromIncomingPendingToConfirmed
    *
    * @param {string} newIdentifier The new identifier
    * @param {string} oldIdentifier The old temporary identifier
    * @param {core.protocol.net.IncomingPendingSocket} pending The incoming pending socket object
    */
    ProtocolConnectionManager.prototype._fromIncomingPendingToConfirmed = function (newIdentifier, oldIdentifier, pending) {
        var socket = pending.socket;
        var outgoingPending = this._outgoingPendingSockets[newIdentifier];

        if (pending.timeout) {
            global.clearTimeout(pending.timeout);
            pending.timeout = null;
        }
        delete this._incomingPendingSockets[oldIdentifier];

        // check if any outgoing are pending
        if (outgoingPending) {
            outgoingPending.closeAtOnce = true;
        }

        socket.setIdentifier(newIdentifier);

        this._addToConfirmed(newIdentifier, 'incoming', socket);
    };

    /**
    * Moves a socket from the incoming pending list to the hydra list. Provides the socket with a new hydra identifier.
    * Calls `_addToHydra` in the end
    *
    * @method core.protocol.net.ProtocolConnectionManager~_fromIncomingPendingToHydra
    *
    * @param {string} oldIdentifier The old temporary identifier
    * @param {core.protocol.net.IncomingPendingSocket} pending The incoming pending socket object
    * @returns {string} The new hydra identifier of the socket
    */
    ProtocolConnectionManager.prototype._fromIncomingPendingToHydra = function (oldIdentifier, pending) {
        var socket = pending.socket;

        if (pending.timeout) {
            global.clearTimeout(pending.timeout);
            pending.timeout = null;
        }
        delete this._incomingPendingSockets[oldIdentifier];

        var identifier = this._setHydraIdentifier(socket);

        this._addToHydra(identifier, socket);

        return identifier;
    };

    /**
    * Returns a confirmed socket stored under the provided identifer. Returns `null` if there is none.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_getConfirmedSocketByIdentifier
    *
    * @param {string} identifier
    * @returns {core.net.tcp.TCPSocketInterface}
    */
    ProtocolConnectionManager.prototype._getConfirmedSocketByIdentifier = function (identifier) {
        var existing = this._confirmedSockets[identifier];
        if (existing) {
            return existing.socket;
        }
        return null;
    };

    /**
    * When the socket is closed remotely, make sure that the socket object is cleaned up.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_hookDestroyOnCloseToSocket
    *
    * @param {core.net.tcp.TCPSocketInterface} socket
    */
    ProtocolConnectionManager.prototype._hookDestroyOnCloseToSocket = function (socket) {
        var _this = this;
        // remote close
        socket.on('close', function () {
            _this._destroyConnection(socket, false);
        });
    };

    /**
    * Checks whether the provided identifier matches with the hexadecimal string representation of the provided
    * node's ID.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_identifierAndContactNodeMatch
    *
    * @param {string} identifier Identifier to check
    * @param {core.topology.ContactNodeInterface} node ContactNode whose ID to check against the identifier
    * @returns {boolean} `True` if they match, else false
    */
    ProtocolConnectionManager.prototype._identifierAndContactNodeMatch = function (identifier, node) {
        return identifier === this._nodeToIdentifier(node);
    };

    /**
    * Tries to open a client connection to the provided contactNode and adds a corresponding entry to the
    * outgoing pending socket list.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_initiateOutgoingConnection
    *
    * @param {core.topology.ContactNodeInterface} contactNode
    */
    ProtocolConnectionManager.prototype._initiateOutgoingConnection = function (contactNode) {
        var _this = this;
        var identifier = this._nodeToIdentifier(contactNode);

        if (!this._outgoingPendingSockets[identifier]) {
            var outgoingEntry = {
                closeAtOnce: false
            };

            this._outgoingPendingSockets[identifier] = outgoingEntry;

            this._tryToOutgoingConnectToNode(contactNode, function (socket) {
                delete _this._outgoingPendingSockets[identifier];
                if (socket) {
                    if (outgoingEntry.closeAtOnce) {
                        socket.end();
                    } else {
                        socket.setIdentifier(identifier);
                        _this._incomingDataPipeline.hookSocket(socket);
                        _this._addToConfirmed(identifier, 'outgoing', socket);
                    }
                }
            });
        }
    };

    /**
    * Returns the hexadecimal string representation of a node's ID
    *
    * @method core.protocol.net.ProtocolConnectionManager~_nodeToIdentifier
    *
    * @param {core.topology.ContactNodeInterface} node
    * @returns {string}
    */
    ProtocolConnectionManager.prototype._nodeToIdentifier = function (node) {
        return node.getId().toHexString();
    };

    /**
    * The listener on the class's `confirmedSocket` event. When a confirmedSocket rolls in, it checks
    * if there are any functions already waiting for the socket. If yes, they are iterated over and called one by one
    * (in their original order), clearing their timeouts as well.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_onConfirmedSocket
    *
    * @param {string} identifier The identifier of the confirmed socket
    * @param {core.net.tcp.TCPSocketInterface} socket The new confirmed socket itself.
    */
    ProtocolConnectionManager.prototype._onConfirmedSocket = function (identifier, socket) {
        var waiting = this._connectionWaitingList[identifier];
        if (waiting) {
            for (var i = 0; i < waiting.length; i++) {
                var item = waiting[i];
                global.clearTimeout(item.timeout);
                item.timeout = null;

                item.callback(null, socket);
            }

            delete this._connectionWaitingList[identifier];
        }
    };

    /**
    * The listener on the TCP handler's `connected` event with 'incoming' as direction.
    * Provides the socket with a temporary identifier, hooks it to the pipeline and adds it the incoming pending list.
    * It also kicks off a timeout which destroys the socket when elapsed (this is cleared as soon as the socket gets
    * a valid identifier)
    *
    * @method core.protocol.net.ProtocolConnectionManager~_onincomingConnection
    *
    * @param {core.net.tcp.TCPSocketInterface} socket
    */
    ProtocolConnectionManager.prototype._onIncomingConnection = function (socket) {
        var _this = this;
        var identifier = this._setTemporaryIdentifier(socket);
        var pending = {
            socket: socket,
            timeout: global.setTimeout(function () {
                _this._destroyConnection(socket);
            }, this._incomingPendingTimeoutLength)
        };
        this._incomingPendingSockets[identifier] = pending;
        this._incomingDataPipeline.hookSocket(socket);
    };

    /**
    * The listener on the pipeline's message event, when a valid readable hydra message comes rolling in.
    * Checks if the message came from an incoming socket with a temporary identifier. If so, it assigns it a
    * hydra identifier and adds it to the list.
    * Otherwise it checks if the identifier of the socket is a valid hydra identifier. If not, the responsible socket
    * is destroyed because of non-compliance with the protocol.
    *
    * Propagates the message in a `hydraMessage` event if not stated otherwise.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_onHydraMessage
    *
    * @param {string} identifier The identifier of the socket over which the message was sent
    * @param {core.protocol.messages.ReadableMessageInterface} message The received message
    */
    ProtocolConnectionManager.prototype._onHydraMessage = function (identifier, message) {
        var propagateMessage = true;
        var incomingPending = this._incomingPendingSockets[identifier];

        var hydraIdentifier = identifier;

        if (incomingPending) {
            hydraIdentifier = this._fromIncomingPendingToHydra(identifier, incomingPending);
        } else if (!(this._hydraSockets[identifier])) {
            logger.log('hydra', 'Closing socket due to non-compliance', { socketIdent: identifier });
            propagateMessage = false;
            this._destroyConnectionByIdentifier(identifier);
        }

        if (propagateMessage) {
            this.emit('hydraMessage', hydraIdentifier, this.getHydraSocketIp(hydraIdentifier), message);
        }
    };

    /**
    * The listener on the pipeline's message event, when a valid readable message comes rolling in.
    * Checks if the message came from an incoming socket with a temporary identifier. If so, it tries to assign it
    * the ID of sender of the message.
    * Otherwise it checks if the identifier of the socket and the sender of the message match. If not, the responsible
    * socket is destroyed and the message not propagated, because it hints to some non-compliance with the protocol.
    *
    * Propagates the message in a `message` event if not stated otherwise.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_onMessage
    *
    * @param {string} identifier The identifier of the socket over which the message was sent
    * @param {core.protocol.messages.ReadableMessageInterface} message The received message
    */
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

    /**
    * Sets up all needed listeners, which is:
    * - listening to messages of the data pipeline
    * - listening to incoming connections of the TCP socket handler
    * - internally hooking to the class's `confirmedSocket` event
    *
    * @method core.protocol.net.ProtocolConnectionManager~_setGlobalListeners
    */
    ProtocolConnectionManager.prototype._setGlobalListeners = function () {
        var _this = this;
        this._incomingDataPipeline.on('message', function (identifier, message) {
            _this._onMessage(identifier, message);
        });

        this._incomingDataPipeline.on('hydraMessage', function (identifier, message) {
            _this._onHydraMessage(identifier, message);
        });

        this._incomingDataPipeline.on('memoryExcess', function (identifier) {
            _this._destroyConnectionByIdentifier(identifier);
        });

        this._tcpSocketHandler.on('connected', function (socket, direction) {
            if (direction === 'incoming') {
                _this._onIncomingConnection(socket);
            }
        });

        this._tcpSocketHandler.on('ipReset', function (ip) {
            if (_this._tcpSocketHandler.getOpenServerPortsArray().length) {
                console.log('External IP change must be handled');

                // has no proxy, so change the addresses
                _this._myNode.updateAddresses(_this.getExternalAddressList(), 'ipChange');
            }
        });

        this.on('confirmedSocket', this._onConfirmedSocket);
    };

    /**
    * Provides the socket with a hydra identifier and returns the same.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_setHydraIdentifier
    *
    * @param {core.net.tcp.TCPSocketInterface} socket
    * @returns {string} The set identifier
    */
    ProtocolConnectionManager.prototype._setHydraIdentifier = function (socket) {
        var identifier = this._hydraIdentifierPrefix + (++this._hydraIdentifierCount);
        socket.setIdentifier(identifier);

        return identifier;
    };

    /**
    * Provides the socket with a temporary identifier and returns the same.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_setTemporaryIdentifier
    *
    * @param {core.net.tcp.TCPSocketInterface} socket
    * @returns {string} The set identifier
    */
    ProtocolConnectionManager.prototype._setTemporaryIdentifier = function (socket) {
        var identifier = this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount);
        socket.setIdentifier(identifier);

        return identifier;
    };

    /**
    * Tries to establish a client TCP connection to a contact node by iterating over its addresses and probing each one
    * of them until a successful socket could be established or it runs out of addresses.
    * A callback is called nevertheless, if success with the established socket as argument, else with `null`.
    *
    * @method core.protocol.net.ProtocolConnectionManager~_tryToOutgoingConnectToNode
    *
    * @param {core.topology.ContactNodeInterface} contactNode Node to connect to
    * @param {Function} callback
    */
    ProtocolConnectionManager.prototype._tryToOutgoingConnectToNode = function (contactNode, callback) {
        var addresses = contactNode.getAddresses();
        var startAt = 0;
        var maxIndex = addresses.length - 1;
        var tcpSocketHandler = this._tcpSocketHandler;

        var connectToAddressByIndex = function (i, callback) {
            var address = addresses[i];
            tcpSocketHandler.connectTo(address.getPort(), address.getIp(), callback);
        };
        var theCallback = function (socket) {
            if (!socket) {
                if (++startAt <= maxIndex) {
                    connectToAddressByIndex(startAt, theCallback);
                    return;
                }
            }
            callback(socket);
        };

        if (maxIndex >= 0) {
            connectToAddressByIndex(startAt, theCallback);
        } else {
            callback(null);
        }
    };
    return ProtocolConnectionManager;
})(events.EventEmitter);

module.exports = ProtocolConnectionManager;
//# sourceMappingURL=ProtocolConnectionManager.js.map
