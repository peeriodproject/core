var HydraCell = require('./HydraCell');

/**
* HydraCellFactoryInterface implementation.
*
* @class core.protocol.hydra.HydraCellFactory
* @implements core.protocol.hydra.HydraCellFactoryInterface
*
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
* @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
* @param {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} decryptionFactory
* @param {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} encryptionFactory
*/
var HydraCellFactory = (function () {
    function HydraCellFactory(connectionManager, messageCenter, decryptionFactory, encryptionFactory) {
        /**
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCellFactory~_connectionManager
        */
        this._connectionManager = null;
        /**
        * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.hydra.HydraCellFactory~_decryptionFactory
        */
        this._decryptionFactory = null;
        /**
        * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.hydra.HydraCellFactory~_encryptionFactory
        */
        this._encryptionFactory = null;
        /**
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCellFactory~_messageCenter
        */
        this._messageCenter = null;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._decryptionFactory = decryptionFactory;
        this._encryptionFactory = encryptionFactory;
    }
    HydraCellFactory.prototype.create = function (predecessorNode) {
        return new HydraCell(predecessorNode, this._connectionManager, this._messageCenter, this._decryptionFactory, this._encryptionFactory);
    };
    return HydraCellFactory;
})();

module.exports = HydraCellFactory;
//# sourceMappingURL=HydraCellFactory.js.map
