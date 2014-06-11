var crypto = require('crypto');

var HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
* Decrypts an encrypted payload with AES-128-GCM. Also does integrity checks if needed.
*
* @class core.protocol.hydra.Aes128GcmReadableDecryptedMessage
* @implements core.protocol.hydra.ReadableDecryptedMessageInterface
*
* @param {Buffer} encryptedContent The encrypted message which needs to be decrypted.
* @param {Buffer} key The symmetric key for decryption.
*/
var Aes128GcmReadableDecryptedMessage = (function () {
    function Aes128GcmReadableDecryptedMessage(encryptedContent, key) {
        /**
        * Flag for the first decrypted byte, which is the indicator byte if this decrypted
        * message is the "receiver message", i.e. if the decrypted content is plaintext now or needs to be
        * decrypted again.
        *
        * @member {boolean} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_isReceiver
        */
        this._isReceiver = false;
        /**
        * Stores the decrypted payload of the message
        *
        * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_payload
        */
        this._payload = null;
        /**
        * The extracted initialization vector of the message.
        *
        * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_iv
        */
        this._iv = null;
        /**
        * The symmetric key of the message
        *
        * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_key
        */
        this._key = null;
        /**
        * The encrypted content which gets stripped off IV, authTag and body step-by-step.
        *
        * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_encryptedContentFull
        */
        this._encryptedContentFull = null;
        this._key = key;

        this._iv = encryptedContent.slice(0, 12);

        this._encryptedContentFull = encryptedContent.slice(12);

        var decipher = crypto.createDecipheriv('aes-128-gcm', this._key, this._iv);

        if (this._extractIsReceiver()) {
            var contentLength = this._encryptedContentFull.length;

            // this is not working yet. wait for node v.0.12
            //decipher.setAuthTag(encryptedContent.slice(contentLength - 16));
            this._encryptedContentFull = this._encryptedContentFull.slice(0, contentLength - 16);
        }

        this._payload = decipher.update(this._encryptedContentFull).slice(1);

        try  {
            decipher.final();
        } catch (e) {
            if (this._isReceiver && !Aes128GcmReadableDecryptedMessage.SKIP_AUTH) {
                this._payload = null;
                throw new Error('Aes128GcmReadableDecryptedMessage: Integrity check fail!');
            }
            // else no authentication needed. simply proceed.
        }
    }
    Aes128GcmReadableDecryptedMessage.prototype.isReceiver = function () {
        return this._isReceiver;
    };

    Aes128GcmReadableDecryptedMessage.prototype.getPayload = function () {
        return this._payload;
    };

    /**
    * Decrypts the first byte and decides (with the help of the byte cheatsheet) if this message
    * is the "receiver" message.
    *
    * @method core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_extractIsReceiver
    *
    * @returns {boolean} The result of the check.
    */
    Aes128GcmReadableDecryptedMessage.prototype._extractIsReceiver = function () {
        var decipher = crypto.createDecipheriv('aes-128-gcm', this._key, this._iv);

        // we check the first byte
        var firstByte = decipher.update(this._encryptedContentFull.slice(0, 1))[0];

        try  {
            // this will fail
            decipher.final();
        } catch (e) {
        }

        if (firstByte === HydraByteCheatsheet.encryptedMessages.isReceiver) {
            this._isReceiver = true;
        } else if (firstByte !== HydraByteCheatsheet.encryptedMessages.notReceiver) {
            throw new Error('Aes128GcmReadableDecryptedMessage: Unknown indicator byte');
        }

        return this._isReceiver;
    };
    Aes128GcmReadableDecryptedMessage.SKIP_AUTH = true;
    return Aes128GcmReadableDecryptedMessage;
})();

module.exports = Aes128GcmReadableDecryptedMessage;
//# sourceMappingURL=Aes128GcmReadableDecryptedMessage.js.map
