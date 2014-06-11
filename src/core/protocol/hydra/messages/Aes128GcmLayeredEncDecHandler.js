var Aes128GcmReadableDecryptedMessage = require('./Aes128GcmReadableDecryptedMessage');
var Aes128GcmWritableMessageFactory = require('./Aes128GcmWritableMessageFactory');

var Aes128GcmLayeredEncDecHandler = (function () {
    function Aes128GcmLayeredEncDecHandler(initialNode) {
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
            this._iterativeEncrypt(0, payload, earlyExit, callback);
        }
    };

    Aes128GcmLayeredEncDecHandler.prototype._iterativeEncrypt = function (index, payload, earlyExit, callback) {
        var _this = this;
        var nodeSize = this._nodes.length - 1;
        var node = this._nodes[nodeSize - index];
        var isExit = earlyExit ? this._compareNodes(node, earlyExit) : (index === nodeSize);

        if (earlyExit && index === nodeSize && !isExit) {
            callback(new Error('Aes128GcmLayeredEncDecHandler: All nodes exhausted, no early exit node found.'), null);
        } else {
            this._encryptFactory.encryptMessage(node.outgoingKey, (index === 0), payload, function (err, encryptedMsg) {
                if (err) {
                    callback(err, null);
                } else {
                    if (isExit) {
                        callback(null, encryptedMsg);
                    } else {
                        setImmediate(function () {
                            _this._iterativeEncrypt(++index, encryptedMsg, earlyExit, callback);
                        });
                    }
                }
            });
        }
    };

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

    Aes128GcmLayeredEncDecHandler.prototype._iterativeDecrypt = function (index, payload, callback) {
        var _this = this;
        if (index === this._nodes.length - 1) {
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
    return Aes128GcmLayeredEncDecHandler;
})();

module.exports = Aes128GcmLayeredEncDecHandler;
//# sourceMappingURL=Aes128GcmLayeredEncDecHandler.js.map
