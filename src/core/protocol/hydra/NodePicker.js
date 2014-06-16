var NodePicker = (function () {
    function NodePicker(hydraConfig, relayNodeAmount, routingTable) {
        this._relayNodeAmount = 0;
        this._additiveNodeAmount = 0;
        this._routingTable = null;
        this._waitingTimeInMs = 0;
        this._threshold = 0;
        this._errorThreshold = 0;
        this._relayNodes = [];
        this._nodesUsed = [];
        this._relayNodeAmount = relayNodeAmount;
        this._additiveNodeAmount = hydraConfig.get('hydra.additiveSharingNodeAmount');
        this._threshold = hydraConfig.get('hydra.nodePicker.roundThreshold');
        this._waitingTimeInMs = hydraConfig.get('hydra.nodePicker.waitingTimeInSeconds') * 1000;
        this._errorThreshold = hydraConfig.get('hydra.nodePicker.errorThreshold');

        this._routingTable = routingTable;
    }
    NodePicker.prototype.getRelayNodes = function () {
        return this._relayNodes;
    };

    NodePicker.prototype.getNodesUsed = function () {
        return this._nodesUsed;
    };

    NodePicker.prototype.getAdditiveNodeAmount = function () {
        return this._additiveNodeAmount;
    };

    NodePicker.prototype.getThreshold = function () {
        return this._threshold;
    };

    NodePicker.prototype.getWaitingTime = function () {
        return this._waitingTimeInMs;
    };

    NodePicker.prototype.getErrorThreshold = function () {
        return this._errorThreshold;
    };

    NodePicker.prototype.pickRelayNodeBatch = function (callback) {
        var _this = this;
        if (this._relayNodes.length) {
            throw new Error('NodePicker: Relay nodes can only be picked once!');
        }

        this._pickBatch(this._relayNodeAmount, false, function (batch) {
            _this._relayNodes = batch;

            callback(batch);
        });
    };

    NodePicker.prototype.pickNextAdditiveNodeBatch = function (callback) {
        var _this = this;
        if (!this._relayNodes.length) {
            throw new Error('NodePicker: Picking additive nodes before relay nodes is not allowed!');
        }

        this._pickBatch(this._additiveNodeAmount, true, function (batch) {
            _this._nodesUsed = _this._nodesUsed.concat(batch);
            callback(batch);
        });
    };

    NodePicker.prototype._contactNodeToRandHydraNode = function (contactNode) {
        var retNode = null;

        var addresses = contactNode.getAddresses();

        if (addresses.length) {
            var address = addresses[Math.floor(Math.random() * addresses.length)];

            if (address.getIp() && address.getPort()) {
                retNode = {
                    ip: address.getIp(),
                    port: address.getPort()
                };
            }
        }

        return retNode;
    };

    NodePicker.prototype._nodeExistsInBatch = function (node, batch) {
        var exists = false;
        var ip = node.ip;

        for (var i = 0, l = batch.length; i < l; i++) {
            if (batch[i].ip === ip) {
                exists = true;
                break;
            }
        }

        return exists;
    };

    NodePicker.prototype._pickBatch = function (amount, avoidRelayNodes, callback) {
        var _this = this;
        var returnBatch = [];
        var errorCount = 0;
        var threshold = 0;

        var getRandomNode = function () {
            if (returnBatch.length === amount) {
                callback(returnBatch);
            } else if (errorCount > _this._errorThreshold) {
                global.setTimeout(function () {
                    errorCount = 0;
                    getRandomNode();
                }, _this._waitingTimeInMs);
            } else {
                _this._routingTable.getRandomContactNode(function (err, contactNode) {
                    if (err || !contactNode) {
                        errorCount++;
                    } else {
                        var node = _this._contactNodeToRandHydraNode(contactNode);

                        if (node && !_this._nodeExistsInBatch(node, returnBatch)) {
                            if (!avoidRelayNodes || !_this._nodeExistsInBatch(node, _this._relayNodes)) {
                                if (!_this._nodeExistsInBatch(node, _this._nodesUsed)) {
                                    returnBatch.push(node);
                                } else if (threshold < _this._threshold) {
                                    threshold++;
                                    returnBatch.push(node);
                                } else {
                                    errorCount++;
                                }
                            } else {
                                errorCount++;
                            }
                        } else {
                            errorCount++;
                        }
                    }

                    getRandomNode();
                });
            }
        };

        getRandomNode();
    };
    return NodePicker;
})();

module.exports = NodePicker;
//# sourceMappingURL=NodePicker.js.map
