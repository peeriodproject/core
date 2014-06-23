var Aes128GcmReadableDecryptedMessage = require('./Aes128GcmReadableDecryptedMessage');

/**
* AES-128-GCM implementation of ReadableDecryptedMessageFactoryInterface
*
* @class core.protocol.hydra.Aes128GcmReadableDecryptedMessageFactory
* @implements core.protocol.hydra.ReadableDecryptedMessageFactoryInterface
*/
var Aes128GcmReadableDecryptedMessageFactory = (function () {
    function Aes128GcmReadableDecryptedMessageFactory() {
    }
    Aes128GcmReadableDecryptedMessageFactory.prototype.create = function (encryptedContent, key) {
        var msg = null;

        try  {
            msg = new Aes128GcmReadableDecryptedMessage(encryptedContent, key);
        } catch (e) {
            throw e;
        }

        return msg;
    };
    return Aes128GcmReadableDecryptedMessageFactory;
})();

module.exports = Aes128GcmReadableDecryptedMessageFactory;
//# sourceMappingURL=Aes128GcmReadableDecryptedMessageFactory.js.map
