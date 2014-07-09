import HydraCircuitFactoryInterface = require('./interfaces/HydraCircuitFactoryInterface');
import HydraCircuit = require('./HydraCircuit');
import HydraCircuitInterface = require('./interfaces/HydraCircuitInterface');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import NodePicker = require('./NodePicker');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import LayeredEncDecHandlerFactoryInterface = require('./messages/interfaces/LayeredEncDecHandlerFactoryInterface');
import CircuitExtenderFactoryInterface = require('./interfaces/CircuitExtenderFactoryInterface');

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
 */
class HydraCircuitFactory implements HydraCircuitFactoryInterface {

	/**
	 * @member {core.protocol.hydra.CircuitExtenderFactoryInterface} core.protocol.hydra.HydraCircuitFactory~_circuitExtenderFactory
	 */
	private _circuitExtenderFactory:CircuitExtenderFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCircuitFactory~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 *
	 * @member {core.config.ConfigInterface} core.protocol.hydra.HydraCircuitFactory~_hydraConfig
	 */
	private _hydraConfig:ConfigInterface = null;

	/**
	 *
	 * @member {core.protocol.hydra.LayeredEncDecHandlerFactoryInterface} core.protocol.hydra.HydraCircuitFactory~_layeredEncDecHandlerFactory
	 */
	private _layeredEncDecHandlerFactory:LayeredEncDecHandlerFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCircuitFactory~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	/**
	 * @member {core.topology.RoutingTableInterface} core.protocol.hydra.HyraCircuitFactory~_routingTable
	 */
	private _routingTable:RoutingTableInterface = null;

	public constructor (hydraConfig:ConfigInterface, routingTable:RoutingTableInterface, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, circuitExtenderFactory:CircuitExtenderFactoryInterface, layeredEncDecHandlerFactory:LayeredEncDecHandlerFactoryInterface) {
		this._hydraConfig = hydraConfig;
		this._routingTable = routingTable;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._circuitExtenderFactory = circuitExtenderFactory;
		this._layeredEncDecHandlerFactory = layeredEncDecHandlerFactory;
	}

	public create (numOfRelayNodes:number):HydraCircuitInterface {
		var nodePicker:NodePicker = new NodePicker(this._hydraConfig, numOfRelayNodes, this._routingTable);

		return new HydraCircuit(this._hydraConfig, numOfRelayNodes, nodePicker, this._messageCenter, this._connectionManager, this._layeredEncDecHandlerFactory, this._circuitExtenderFactory);
	}

}

export = HydraCircuitFactory;