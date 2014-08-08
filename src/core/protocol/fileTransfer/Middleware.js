var logger = require('../../utils/logger/LoggerFactory').create();

/**
* MiddlewareInterface implementation.
*
* @class core.protocol.fileTransfer.Middleware
* @implements core.protocol.fileTransfer.MiddlewareInterface
*
* @param {core.protocol.hydra.CellManagerInterface} A working hydra cell manager.
* @param {core.protocol.net.ProtocolConnectionManagerInterface} A working protocol connection manager.
* @param {core.protocol.hydra.HydraMessageCenterInterface} A working hydra message center.
* @param {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} Factory for writable FILE_TRANSFER messages
*/
var Middleware = (function () {
    function Middleware(protocolConfig, transferMessageCenter, cellManager, protocolConnectionManager, hydraMessageCenter, writableFileTransferMessageFactory) {
        /**
        * Stores the hydra cell manager instance.
        *
        * @member {core.protocol.hydra.CellManagerInterface} core.protocol.fileTransfer.Middleware~_cellManager
        */
        this._cellManager = null;
        /**
        * Stores the hydra message center.
        *
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.fileTransfer.Middleware~_hydraMessageCenter
        */
        this._hydraMessageCenter = null;
        /**
        * Stores references to incoming middleware sockets assigned to the identifier of the circuit through which the messages should
        * be piped through.
        *
        * @member {Object} core.protocol.fileTransfer.Middleware~_incomingSockets
        */
        this._incomingSockets = {};
        /**
        * Stores references to outgoing middleware sockets assigned to the concatenation of the fed node's attributes + the circuit
        * through which the EXTERNAL_FEED message came.
        *
        * @member {Object} core.protocol.fileTransfer.Middleware~_outgoingSockets
        */
        this._outgoingSockets = {};
        /**
        * Stores the protocol connection manager.
        *
        * @member {core.protocol.net.ProtcolConnectionManagerInterface} core.protocol.fileTransfer.Middleware~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        this._waitForFeedingRequestResponseInMs = 0;
        this._transferMessageCenter = null;
        /**
        * Stores the factory for writable FILE_TRANSFER messages
        *
        * @member {core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface} core.protocol.fileTransfer.Middleware~_writableFileTransferMessageFactory
        */
        this._writableFileTransferMessageFactory = null;
        this._transferMessageCenter = transferMessageCenter;
        this._cellManager = cellManager;
        this._protocolConnectionManager = protocolConnectionManager;
        this._hydraMessageCenter = hydraMessageCenter;
        this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;
        this._waitForFeedingRequestResponseInMs = protocolConfig.get('protocol.waitForNodeReactionInSeconds') * 1000;

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    Middleware.prototype.getOutgoingList = function () {
        return this._outgoingSockets;
    };

    Middleware.prototype.getIncomingList = function () {
        return this._incomingSockets;
    };

    /**
    * END TESTING PURPOSES ONLY
    */
    Middleware.prototype.addIncomingSocket = function (circuitId, socketIdentifier) {
        var existing = this._incomingSockets[circuitId];

        if (existing) {
            existing.push(socketIdentifier);
        } else {
            this._incomingSockets[circuitId] = [socketIdentifier];
        }
    };

    Middleware.prototype.closeSocketByIdentifier = function (socketIdentifier) {
        this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
    };

    Middleware.prototype.feedNode2 = function (feedingNodes, associatedCircuitId, payloadToFeed) {
        var fed = false;

        for (var i = 0, l = feedingNodes.length; i < l; i++) {
            var node = feedingNodes[i];
            var existingSocket = this._outgoingSockets[this._constructOutgoingKey(node, associatedCircuitId)];

            if (existingSocket) {
                this._feedSocket(existingSocket, node.feedingIdentifier, payloadToFeed);
                fed = true;
                break;
            }
        }

        if (!fed) {
            this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed);
        }
    };

    /**
    * Self explanatory method. Used for assigning outgoing socket identifiers to nodes / circuits.
    *
    * @method core.protocol.fileTransfer.Middleware~_constructOutgoingKey
    *
    * @param {core.protocol.hydra.HydraNode} node The potential node to feed.
    * @param {string} circuitId The identifier of the circuit through which the EXTERNAL_FEED message came through
    * @returns {string} The concatenation used as identifier to assign a socket to.
    */
    Middleware.prototype._constructOutgoingKey = function (node, circuitId) {
        return circuitId + '_' + node.ip + '_' + node.port + '_' + node.feedingIdentifier;
    };

    Middleware.prototype.feedNode = function (feedingNodes, associatedCircuitId, payloadToFeed) {
        var _this = this;
        if (feedingNodes.length) {
            this._retrieveConnectionToNodeAndReduceBatch(feedingNodes, associatedCircuitId, function (node, socketIdentifier, isExisting) {
                if (node && socketIdentifier) {
                    _this._requestFeeding(node, socketIdentifier, function (accepted) {
                        if (!accepted) {
                            _this.feedNode(feedingNodes, associatedCircuitId, payloadToFeed);
                        } else {
                            if (!isExisting) {
                                _this._outgoingSockets[_this._constructOutgoingKey(node, associatedCircuitId)] = socketIdentifier;
                            }

                            _this._feedSocket(socketIdentifier, node.feedingIdentifier, payloadToFeed);
                        }
                    });
                }
            });
        }
    };

    /**
    * Wraps a payload ina GOT_FED message, which again is wrapped in a FILE_TRANSFER message, and pipes it through
    * the TCP hydra socket stored under the given identifier (in the protocol connection manager).
    *
    * @method core.protocol.fileTransfer.Middleware~_feedSocket
    *
    * @param {string} socketIdentifier The TCP hydra socket to use.
    * @param {string} feedingIdentifier The feedingIdentifier of the node to feed. This is used as transferId for the FILE_TRANSFER message.
    * @param {Buffer} payloadToFeed The complete buffer of the message to feed.
    */
    Middleware.prototype._feedSocket = function (socketIdentifier, feedingIdentifier, payloadToFeed) {
        var bufferToSend = null;

        try  {
            bufferToSend = this._hydraMessageCenter.wrapFileTransferMessage(this._writableFileTransferMessageFactory.constructMessage(feedingIdentifier, 'GOT_FED', payloadToFeed));
        } catch (e) {
        }

        if (bufferToSend) {
            this._protocolConnectionManager.hydraWriteMessageTo(socketIdentifier, bufferToSend);
        }
    };

    Middleware.prototype._retrieveConnectionToNodeAndReduceBatch = function (nodeBatch, associatedCircuitId, callback) {
        var existingIndex = undefined;
        var existingConnectionSocketIdent = null;
        var existingConnectionToNode = null;

        for (var i = 0, l = nodeBatch.length; i < l; i++) {
            var node = nodeBatch[i];
            var existingSocket = this._outgoingSockets[this._constructOutgoingKey(node, associatedCircuitId)];

            if (existingSocket) {
                existingIndex = i;
                existingConnectionSocketIdent = existingSocket;
                existingConnectionToNode = node;
                break;
            }
        }

        if (existingIndex !== undefined && existingConnectionSocketIdent && existingConnectionToNode) {
            nodeBatch.splice(existingIndex, 1);
            callback(existingConnectionToNode, existingConnectionSocketIdent, true);
        } else {
            this._connectToNodeAndReduceBatch(nodeBatch, callback);
        }
    };

    Middleware.prototype._connectToNodeAndReduceBatch = function (nodeBatch, callback) {
        var _this = this;
        if (!nodeBatch.length) {
            // callback with nothing
            callback(null, null);
        } else {
            var randIndex = Math.floor(Math.random() * nodeBatch.length);
            var node = nodeBatch.splice(randIndex, 1)[0];

            this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, function (err, identifier) {
                if (!err && identifier) {
                    callback(node, identifier, false);
                } else {
                    _this._connectToNodeAndReduceBatch(nodeBatch, callback);
                }
            });
        }
    };

    Middleware.prototype._requestFeeding = function (node, socketIdentifier, callback) {
        var _this = this;
        var bufferToSend = this._hydraMessageCenter.wrapFileTransferMessage(this._writableFileTransferMessageFactory.constructMessage(node.feedingIdentifier, 'FEED_REQUEST', new Buffer(0)));

        this._protocolConnectionManager.hydraWriteMessageTo(socketIdentifier, bufferToSend);

        var eventName = 'FEEDING_REQUEST_RESPONSE_' + socketIdentifier + '_' + node.feedingIdentifier;
        var timeout = 0;

        var responseListener = function (successful) {
            global.clearTimeout(timeout);
            if (!successful) {
                _this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
            }
            callback(successful);
        };

        // set up the timeout to wait for a response
        timeout = global.setTimeout(function () {
            _this._transferMessageCenter.removeListener(eventName, responseListener);
            _this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
            callback(false);
        }, this._waitForFeedingRequestResponseInMs);

        this._transferMessageCenter.once(eventName, responseListener);
    };

    /**
    * Tries to open a TCP socket to one of the nodes of the provided list. This is done in the fashion described in
    * {@link core.protocol.fileTransfer.MiddlewareInterface}.
    * As soon as a connection has been established, the payload is fed to it.
    *
    * @method core.protocol.fileTransfer.Middleware~_obtainConnectionAndFeed
    *
    * @param {core.protocol.hydra.HydraNodeList} feedingNodes List of potential nodes to feed. The payload is of course, however, only fed to ONE node.
    * @param {string} associatedCircuitId The identifier of the circuit which the originating EXTERNAL_FEED message came through
    * @param {Buffer} payloadToFeed The payload to feed.
    * @param {Array<number>} usedIndices Optional, and only used internally if a follow-up call to this method must be performed. Indicates which nodes in the
    * list have already been probed.
    */
    Middleware.prototype._obtainConnectionAndFeed = function (feedingNodes, associatedCircuitId, payloadToFeed, usedIndices) {
        var _this = this;
        if (typeof usedIndices === "undefined") { usedIndices = []; }
        var feedingNodesLength = feedingNodes.length;

        if (usedIndices.length !== feedingNodesLength) {
            var randIndex = Math.floor(Math.random() * feedingNodesLength);

            if (usedIndices.indexOf(randIndex) >= 0) {
                this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed, usedIndices);
            } else {
                var node = feedingNodes[randIndex];

                usedIndices.push(randIndex);

                this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, function (err, identifier) {
                    if (!err && identifier) {
                        _this._outgoingSockets[_this._constructOutgoingKey(node, associatedCircuitId)] = identifier;

                        _this._feedSocket(identifier, node.feedingIdentifier, payloadToFeed);
                    } else {
                        _this._obtainConnectionAndFeed(feedingNodes, associatedCircuitId, payloadToFeed, usedIndices);
                    }
                });
            }
        }
    };

    /**
    * Sets up the appropriate listeners on the cell manager and the protocol connection manager. Called in constructor.
    *
    * @method core.protocol.fileTransfer.Middleware~_setupListeners
    */
    Middleware.prototype._setupListeners = function () {
        var _this = this;
        this._cellManager.on('tornDownCell', function (circuitId) {
            var incomingSockets = _this._incomingSockets[circuitId];

            if (incomingSockets && incomingSockets.length) {
                for (var i = 0, l = incomingSockets.length; i < l; i++) {
                    _this._protocolConnectionManager.closeHydraSocket(incomingSockets[i]);
                }

                delete _this._incomingSockets[circuitId];
            }

            var outgoingSocketsKeys = Object.keys(_this._outgoingSockets);

            for (var i = 0, l = outgoingSocketsKeys.length; i < l; i++) {
                var key = outgoingSocketsKeys[i];

                if (key.indexOf(circuitId) === 0) {
                    _this._protocolConnectionManager.closeHydraSocket(_this._outgoingSockets[key]);

                    delete _this._outgoingSockets[key];
                }
            }
        });

        this._protocolConnectionManager.on('terminatedConnection', function (identifier) {
            // we do not care for the incoming sockets, they clean themselves up as soon as the circuit is torn down
            // we only care for the outgoing sockets
            var outgoingSocketsKeys = Object.keys(_this._outgoingSockets);

            for (var i = 0, l = outgoingSocketsKeys.length; i < l; i++) {
                var key = outgoingSocketsKeys[i];

                if (_this._outgoingSockets[key] === identifier) {
                    delete _this._outgoingSockets[key];
                    break;
                }
            }
        });
    };
    return Middleware;
})();

module.exports = Middleware;
//# sourceMappingURL=Middleware.js.map
