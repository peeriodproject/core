var Aes128GcmLayeredEncDecHandler = require('./Aes128GcmLayeredEncDecHandler');

/**
* AES-128-GCM implementation of LayeredEncDecHandlerFactoryInterface.
*
* @class core.protocol.hydra.Aes128GcmLayeredEncDecHandlerFactory
* @implements core.protocol.hyfra.LayeredEncDecHandlerFactoryInterface
*/
var Aes128GcmLayeredEncDecHandlerFactory = (function () {
    function Aes128GcmLayeredEncDecHandlerFactory() {
    }
    Aes128GcmLayeredEncDecHandlerFactory.prototype.create = function (initialNode) {
        return new Aes128GcmLayeredEncDecHandler(initialNode);
    };
    return Aes128GcmLayeredEncDecHandlerFactory;
})();

module.exports = Aes128GcmLayeredEncDecHandlerFactory;
//# sourceMappingURL=Aes128GcmLayeredEncDecHandlerFactory.js.map
