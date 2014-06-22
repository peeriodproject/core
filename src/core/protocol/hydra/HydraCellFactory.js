var HydraCell = require('./HydraCell');

/**
* HydraCellFactoryInterface implementation.
*
* @class core.protocol.hydra.HydraCellFactory
* @implements core.protocol.hydra.HydraCellFactoryInterface
*
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
* @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
*/
var HydraCellFactory = (function () {
    function HydraCellFactory(connectionManager, messageCenter) {
        /**
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCellFactory~_connectionManager
        */
        this._connectionManager = null;
        /**
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCellFactory~_messageCenter
        */
        this._messageCenter = null;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
    }
    HydraCellFactory.prototype.create = function (predecessorNode) {
        return new HydraCell(predecessorNode, this._connectionManager, this._messageCenter);
    };
    return HydraCellFactory;
})();

module.exports = HydraCellFactory;
//# sourceMappingURL=HydraCellFactory.js.map
