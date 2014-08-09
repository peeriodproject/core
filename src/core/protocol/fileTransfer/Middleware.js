var logger = require('../../utils/logger/LoggerFactory').create();

/**
* MiddlewareInterface implementation.
*
* @class core.protocol.fileTransfer.Middleware
* @implements core.protocol.fileTransfer.MiddlewareInterface
*
* @param {core.config.ConfigInterface} protocolConfig Configuration object (used for getting the reaction time)
* @parma {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter The working transfer message center.
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
        /**
        * Stores the transfer message center.
        *
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.Middleware~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        /**
        * Stores the number of milliseconds to wait for a reaction to a FEED_REQUEST message until the request is considered failed.
        *
        * @member {number} core.protocol.fileTransfer.Middleware~_waitForFeedingRequestResponseInMs
        */
        this._waitForFeedingRequestResponseInMs = 0;
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

    Middleware.prototype.feedNode = function (feedingNodes, associatedCircuitId, payloadToFeed) {
        var _this = this;
        if (feedingNodes.length) {
            //console.log('Trying to feed nodes %o', feedingNodes);
            this._retrieveConnectionToNodeAndReduceBatch(feedingNodes, associatedCircuitId, function (node, socketIdentifier, isExisting) {
                if (node && socketIdentifier) {
                    //		console.log('retrieved connection to %o with ident %o', node, socketIdentifier);
                    _this._requestFeeding(node, socketIdentifier, function (accepted) {
                        //			console.log('retrieved response to feeding request from %o with response %o', node, accepted);
                        if (!accepted) {
                            // try again
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
    * Tries to connect to a random node within the batch (and removes the node from the batch. Operations are made directly on the array!). Calls back
    * with the appropriate socket identifier if the connection was successful, otherwise tries again until either a connection has correctly been established
    * or all nodes have been exhausted (in the latter case, calls back with double `null`);
    *
    * @method core.protocol.fileTransfer.Middleware~_connectToNodeAndReduceBatch
    *
    * @param {core.protocol.hydra.HydraNodeList} nodeBatch The list of possible nodes to obtain a connection to.
    * @param {Function} callback Function to call when a connection has successfully established or all nodes have been exhausted
    */
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
        //console.log('feeding socket %o', socketIdentifier);
        var bufferToSend = null;

        try  {
            bufferToSend = this._hydraMessageCenter.wrapFileTransferMessage(this._writableFileTransferMessageFactory.constructMessage(feedingIdentifier, 'GOT_FED', payloadToFeed));
        } catch (e) {
        }

        if (bufferToSend) {
            this._protocolConnectionManager.hydraWriteMessageTo(socketIdentifier, bufferToSend);
        }
    };

    /**
    * Sends a FEED_REQUEST message through the given socket, waiting for either acceptance or rejection.
    * The node's feeding identifier is used as transfer identifier for the message, so it can check whether it has
    * any circuits related to the identifier.
    * If the other side fails to respond within a given time, the request is considered failed.
    *
    * @method core.protocol.fileTransfer.Middleware~_requestFeeding
    *
    * @param {core.protocol.hydra.HydraNode} node The node on the other side
    * @param {string} socketIdentifier Identifier of the socket through which to send the FEED_REQUEST
    * @param {Function} callback Method which gets called as soon as either the reaction timeout elapses or the other side
    * responds. Gets called with an `accepted` parameter indicating if the request was successful (accepted) or not (rejected or timed out).
    */
    Middleware.prototype._requestFeeding = function (node, socketIdentifier, callback) {
        var _this = this;
        var bufferToSend = this._hydraMessageCenter.wrapFileTransferMessage(this._writableFileTransferMessageFactory.constructMessage(node.feedingIdentifier, 'FEED_REQUEST', new Buffer(0)));

        var eventName = 'FEEDING_REQUEST_RESPONSE_' + socketIdentifier + '_' + node.feedingIdentifier;
        var timeout = 0;

        var responseListener = function (successful) {
            //console.log('received a response with %o', successful);
            global.clearTimeout(timeout);
            if (!successful) {
                _this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
            }
            callback(successful);
        };

        //		console.log('request feeding. number of timeout is %o', this._waitForFeedingRequestResponseInMs);
        //		console.log('waiting for event on %o', eventName);
        // set up the timeout to wait for a response
        timeout = global.setTimeout(function () {
            //console.log('timing out');
            _this._transferMessageCenter.removeListener(eventName, responseListener);
            _this._protocolConnectionManager.closeHydraSocket(socketIdentifier);
            callback(false);
        }, this._waitForFeedingRequestResponseInMs);

        this._transferMessageCenter.once(eventName, responseListener);

        this._protocolConnectionManager.hydraWriteMessageTo(socketIdentifier, bufferToSend);
    };

    /**
    * Checks if there is still a valid connection to a node in the nodes-to-feed batch (must be associated to the circuit
    * which the EXTERNAL_FEED message came through). If yes, calls back with this existing socket, otherwise tries to
    * obtain a connection to any node within the batch.
    * 'Reduces' the batch by removing the node, to which a connection already exists (operation directly on array).
    *
    * @method core.protocol.fileTransfer.Middleware~_retrieveConnectionToNodeAndReduceBatch
    *
    * @param {core.protocol.hydra.HydraNodeList} nodeBatch The list of nodes to get a connection to
    * @param {string} associatedCircuitId The identifier of the circuit through which the original EXTERNAL_FEED message came through.
    * This is used to correctly relate already open sockets to the correct circuits.
    * @param {Function} callback Method that gets called as soon as a connection has been opened to a node.
    */
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
