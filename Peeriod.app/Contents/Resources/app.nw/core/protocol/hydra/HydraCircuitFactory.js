var HydraCircuit = require('./HydraCircuit');

var NodePicker = require('./NodePicker');

/**
* @class core.protocol.hydra.HydraCircuitFactory
* @implements core.protocol.hydra.HydraCircuitFactoryInterface
*
* @param {core.config.ConfigInterface} hydraConfig
* @param {core.topology.RoutingTableInterface} routingTable
* @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
* @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
* @param {core.protocol.hydra.CircuitExtenderFactoryInterface} circuitExtenderFactory
* @param {core.protocol.hydra.LayeredEncDecHandlerFactoryInterface} layeredEncDecHandlerFactory
* @param {core.net.tcp.TCPSocketHandlerInterface} tcpSocketHandler
*/
var HydraCircuitFactory = (function () {
    function HydraCircuitFactory(hydraConfig, routingTable, connectionManager, messageCenter, circuitExtenderFactory, layeredEncDecHandlerFactory, tcpSocketHandler) {
        /**
        * @member {core.protocol.hydra.CircuitExtenderFactoryInterface} core.protocol.hydra.HydraCircuitFactory~_circuitExtenderFactory
        */
        this._circuitExtenderFactory = null;
        /**
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCircuitFactory~_connectionManager
        */
        this._connectionManager = null;
        /**
        *
        * @member {core.config.ConfigInterface} core.protocol.hydra.HydraCircuitFactory~_hydraConfig
        */
        this._hydraConfig = null;
        /**
        *
        * @member {core.protocol.hydra.LayeredEncDecHandlerFactoryInterface} core.protocol.hydra.HydraCircuitFactory~_layeredEncDecHandlerFactory
        */
        this._layeredEncDecHandlerFactory = null;
        /**
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCircuitFactory~_messageCenter
        */
        this._messageCenter = null;
        /**
        * @member {core.topology.RoutingTableInterface} core.protocol.hydra.HyraCircuitFactory~_routingTable
        */
        this._routingTable = null;
        /**
        * @member {core.net.tcp.TCPSocketHandlerInterface} core.protocol.hydra.HyraCircuitFactory~_tcpSocketHandler
        */
        this._tcpSocketHandler = null;
        this._hydraConfig = hydraConfig;
        this._routingTable = routingTable;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._circuitExtenderFactory = circuitExtenderFactory;
        this._layeredEncDecHandlerFactory = layeredEncDecHandlerFactory;
        this._tcpSocketHandler = tcpSocketHandler;
    }
    HydraCircuitFactory.prototype.create = function (numOfRelayNodes) {
        var nodePicker = new NodePicker(this._hydraConfig, numOfRelayNodes, this._routingTable, this._tcpSocketHandler);

        return new HydraCircuit(this._hydraConfig, numOfRelayNodes, nodePicker, this._messageCenter, this._connectionManager, this._layeredEncDecHandlerFactory, this._circuitExtenderFactory);
    };
    return HydraCircuitFactory;
})();

module.exports = HydraCircuitFactory;
//# sourceMappingURL=HydraCircuitFactory.js.map
