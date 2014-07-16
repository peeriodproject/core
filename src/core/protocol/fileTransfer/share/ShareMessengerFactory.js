var ShareMessenger = require('./ShareMessenger');

/**
* ShareMessengerFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.ShareMessengerFactory
* @implements core.protocol.fileTransfer.share.ShareMessengerFactoryInterface
*
* @param {core.config.ConfigInterface} fileTransferConfig
* @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
* @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
*/
var ShareMessengerFactory = (function () {
    function ShareMessengerFactory(fileTransferConfig, circuitManager, transferMessageCenter) {
        /**
        * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.ShareMessengerFactory~_circuitManager
        */
        this._circuitManager = null;
        /**
        * @member {core.config.ConfigInterface} core.protocol.fileTransfer.share.ShareMessengerFactory~_config
        */
        this._config = null;
        /**
        * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.ShareMessengerFactory~_transferMessageCenter
        */
        this._transferMessageCenter = null;
        this._config = fileTransferConfig;
        this._circuitManager = circuitManager;
        this._transferMessageCenter = transferMessageCenter;
    }
    ShareMessengerFactory.prototype.createMessenger = function () {
        return new ShareMessenger(this._config, this._circuitManager, this._transferMessageCenter);
    };
    return ShareMessengerFactory;
})();

module.exports = ShareMessengerFactory;
//# sourceMappingURL=ShareMessengerFactory.js.map
