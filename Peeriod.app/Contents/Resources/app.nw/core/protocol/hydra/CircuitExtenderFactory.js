var CircuitExtender = require('./CircuitExtender');

/**
* CircuitExtenderFactoryInterface implementation.
*
* @class core.protocol.hydra.CircuitExtenderFactory
* @implements @class core.protocol.hydra.CircuitExtenderFactoryInterface
*
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
* @oaran {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
*/
var CircuitExtenderFactory = (function () {
    function CircuitExtenderFactory(connectionManager, messageCenter) {
        /**
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.CircuitExtenderFactory~_connectionManager
        */
        this._connectionManager = null;
        /**
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.CircuitExtenderFactory~_messageCenter
        */
        this._messageCenter = null;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
    }
    CircuitExtenderFactory.prototype.create = function (reactionTimeInMs, reactionTimeFactor, encDecHandler) {
        return new CircuitExtender(reactionTimeInMs, reactionTimeFactor, this._connectionManager, this._messageCenter, encDecHandler);
    };
    return CircuitExtenderFactory;
})();

module.exports = CircuitExtenderFactory;
//# sourceMappingURL=CircuitExtenderFactory.js.map
