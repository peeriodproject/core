var Middleware = (function () {
    function Middleware(cellManager, protocolConnectionManager, hydraMessageCenter, writableFileTransferMessageFactory) {
        this._cellManager = null;
        this._protocolConnectionManager = null;
        this._hydraMessageCenter = null;
        this._writableFileTransferMessageFactory = null;
        this._outgoingSockets = {};
        this._incomingSockets = {};
        this._cellManager = cellManager;
        this._protocolConnectionManager = protocolConnectionManager;
        this._hydraMessageCenter = hydraMessageCenter;
        this._writableFileTransferMessageFactory = writableFileTransferMessageFactory;

        this._setupListeners();
    }
    Middleware.prototype.feedNode = function (feedingNodes, associatedCircuitId, payloadToFeed) {
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

    Middleware.prototype._constructOutgoingKey = function (node, circuitId) {
        return circuitId + '_' + node.ip + '_' + node.port + '_' + node.feedingIdentifier;
    };

    Middleware.prototype._setupListeners = function () {
        var _this = this;
        this._cellManager.on('tornDownCell', function (circuitId) {
            var incomingSockets = _this._incomingSockets[circuitId];

            if (incomingSockets && incomingSockets.length) {
                for (var i = 0, l = incomingSockets.length; i < l; i++) {
                    _this._protocolConnectionManager.closeHydraSocket(circuitId);
                }

                delete _this._incomingSockets[circuitId];
            }

            var outgoingSocketsKeys = Object.keys(_this._outgoingSockets);

            for (var i = 0, l = outgoingSocketsKeys.length; i < l; i++) {
                var key = outgoingSocketsKeys[i];

                if (key.indexOf(circuitId) === 0) {
                    _this._protocolConnectionManager.closeHydraSocket(key);

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
