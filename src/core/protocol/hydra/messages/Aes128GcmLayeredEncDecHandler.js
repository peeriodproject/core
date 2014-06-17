var Aes128GcmReadableDecryptedMessage = require('./Aes128GcmReadableDecryptedMessage');
var Aes128GcmWritableMessageFactory = require('./Aes128GcmWritableMessageFactory');

/**
* Layered encryption/decryption handler using AES-128-GCM
*
* @class core.protocol.hydra.Aes128GcmLayeredEncDecHandler
* @implements core.protocol.hydra.LayeredEncDecHandlerInterface
*
* @param {core.protocol.hydra.HydraNode} initialNode Optional. Node which gets added to the node list at once.
*/
var Aes128GcmLayeredEncDecHandler = (function () {
    function Aes128GcmLayeredEncDecHandler(initialNode) {
        /**
        * Ordered list which stores the nodes used for layered encryption / decryption.
        *
        * @member {core.protocol.hydra.HydraNodeList} core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_nodes
        */
        this._nodes = [];
        if (initialNode) {
            this.addNode(initialNode);
        }

        this._encryptFactory = new Aes128GcmWritableMessageFactory();
    }
    Aes128GcmLayeredEncDecHandler.prototype.addNode = function (node) {
        if (!(node.incomingKey && node.outgoingKey)) {
            throw new Error('Aes128GcmLayeredEncDecHandler: Outgoing and incoming symmetric key must be specified');
        }

        this._nodes.push(node);
    };

    Aes128GcmLayeredEncDecHandler.prototype.decrypt = function (payload, callback) {
        if (!this._nodes.length) {
            callback(new Error('Aes128GcmLayeredEncDecHandler: No nodes for decryption'), null);
        } else {
            this._iterativeDecrypt(0, payload, callback);
        }
    };

    Aes128GcmLayeredEncDecHandler.prototype.encrypt = function (payload, earlyExit, callback) {
        if (!this._nodes.length) {
            callback(new Error('Aes128GcmLayeredEncDecHandler: No nodes for encryption'), null);
        } else {
            var startAt = this._nodes.length - 1;

            if (earlyExit) {
                var found = false;

                for (var i = 0; i < this._nodes.length; i++) {
                    if (this._compareNodes(this._nodes[i], earlyExit)) {
                        startAt = i;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    callback(new Error('Aes128GcmLayeredEncDecHandler: All nodes exhausted, no early exit node found.'), null);
                    return;
                }
            }

            this._iterativeEncrypt(startAt, true, payload, callback);
        }
    };

    Aes128GcmLayeredEncDecHandler.prototype.getNodes = function () {
        return this._nodes;
    };

    /**
    * Compares two hydra nodes by their outgoing symmetric keys.
    *
    * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_compareNodes
    *
    * @param {core.protocol.hydra.HydraNode} a
    * @param {core.protocol.hydra.HydraNode} b
    * @returns {boolean} `true` if the keys are identical, `false` otherwise
    */
    Aes128GcmLayeredEncDecHandler.prototype._compareNodes = function (a, b) {
        var c = a.outgoingKey;
        var d = b.outgoingKey;

        if (c.length !== d.length) {
            return false;
        }

        var ret = true;

        for (var i = 0; i < c.length; i++) {
            if (c[i] !== d[i]) {
                ret = false;
                break;
            }
        }

        return ret;
    };

    /**
    * Iteratively decrypts a message in the 'peeling off layer by layer' fashion.
    *
    * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_iterativeDecrypt
    *
    * @param {number} index Index of node in list to decrypt with
    * @param {Buffer} payload Payload to decrypt
    * @param {Function} callback
    */
    Aes128GcmLayeredEncDecHandler.prototype._iterativeDecrypt = function (index, payload, callback) {
        var _this = this;
        if (index === this._nodes.length) {
            callback(new Error('Aes128GcmLayeredEncDecHandler: All nodes exhausted, could not completely decrypt.'), null);
        } else {
            var calledBack = false;
            var msg = null;

            try  {
                msg = new Aes128GcmReadableDecryptedMessage(payload, this._nodes[index].incomingKey);
            } catch (e) {
                calledBack = true;
                callback(e, null);
            }

            if (!calledBack) {
                if (msg.isReceiver()) {
                    callback(null, msg.getPayload());
                } else {
                    setImmediate(function () {
                        _this._iterativeDecrypt(++index, msg.getPayload(), callback);
                    });
                }
            }
        }
    };

    /**
    * Iteratively encrypts a message layer by layer (up to finsish or early exit node)
    *
    * @method core.protocol.hydra.Aes128GcmLayeredEncDecHandler~_iterativeEncrypt
    *
    * @param {number} index Index of node in list to encrypt with.
    * @param {boolean} isReceiver Indicates whether the message should be encrypted as a 'receiver' message
    * @param {Buffer} payload Payload to encrypt
    * @param {Function} callback
    */
    Aes128GcmLayeredEncDecHandler.prototype._iterativeEncrypt = function (index, isReceiver, payload, callback) {
        var _this = this;
        this._encryptFactory.encryptMessage(this._nodes[index].outgoingKey, isReceiver, payload, function (err, encryptedMsg) {
            if (err) {
                callback(err, null);
            } else {
                if (index === 0) {
                    callback(null, encryptedMsg);
                } else {
                    setImmediate(function () {
                        _this._iterativeEncrypt(--index, false, encryptedMsg, callback);
                    });
                }
            }
        });
    };
    return Aes128GcmLayeredEncDecHandler;
})();

module.exports = Aes128GcmLayeredEncDecHandler;
//# sourceMappingURL=Aes128GcmLayeredEncDecHandler.js.map
