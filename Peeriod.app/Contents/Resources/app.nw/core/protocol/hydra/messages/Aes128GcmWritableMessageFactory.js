var crypto = require('crypto');

var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* AES 128 Galois Counter Mode implementation of WritableEncryptedMessageFactoryInterface
*
* @class core.protocol.hydra.Aes128GcmWritableMessageFactory
* @implements core.protocol.hydra.WritableEncryptedMessageFactoryInterface
*/
var Aes128GcmWritableMessageFactory = (function () {
    function Aes128GcmWritableMessageFactory() {
    }
    Aes128GcmWritableMessageFactory.prototype.encryptMessage = function (key, isReceiver, payload, callback) {
        var _this = this;
        this.getIV(function (iv) {
            var outputBuffer = null;
            var err = null;

            try  {
                var outputArray = [iv];
                var cipher = crypto.createCipheriv('aes-128-gcm', key, iv);

                outputArray.push(cipher.update(new Buffer([HydraByteCheatsheet.encryptedMessages[isReceiver ? 'isReceiver' : 'notReceiver']])));
                outputArray.push(cipher.update(payload));

                cipher.final();

                if (isReceiver) {
                    outputArray.push(_this._getAuthTagByCipher(cipher));
                }

                outputBuffer = Buffer.concat(outputArray, 13 + payload.length + (isReceiver ? 16 : 0));
            } catch (e) {
                err = e;
            }

            callback(err, outputBuffer);
        });
    };

    /**
    * Returns the authentication tag of finalized cipher.
    *
    * !!!ATTENTION!!!!
    * This is work in production! node.js's crypto module supports `getAuthTag` only since v.0.11.10,
    * so true authentication will land when node.js v.0.12 is stable and node-webkit has caught up!
    *
    * @method core.protocol.hydra.Aes128GcmWritableMessageFactory~_getAuthTagByCipher
    *
    * @param {crypto.Cipher} cipher The finalized cipher object
    * @returns {Buffer} The authentication tag as Buffer.
    */
    Aes128GcmWritableMessageFactory.prototype._getAuthTagByCipher = function (cipher) {
        var ret = new Buffer(16);

        ret.fill(0xff);

        return ret;
    };

    /**
    * Gets a cryptographically secure random initialization vector for GCM of length 12.
    * If the entropy source is drained, it retries until it succeeds.
    *
    * @method core.protocol.hydra.Aes128GcmWritableMessageFactory#getIV
    *
    * @param {Function} callback Function which gets called with the resulting initialization vector as Buffer.
    */
    Aes128GcmWritableMessageFactory.prototype.getIV = function (callback) {
        var _this = this;
        crypto.randomBytes(12, function (err, output) {
            if (err) {
                setImmediate(function () {
                    _this.getIV(callback);
                });
            } else {
                callback(output);
            }
        });
    };
    return Aes128GcmWritableMessageFactory;
})();

module.exports = Aes128GcmWritableMessageFactory;
//# sourceMappingURL=Aes128GcmWritableMessageFactory.js.map
