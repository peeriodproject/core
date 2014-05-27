import ProtocolGatewayInterface = require('./interfaces/ProtocolGatewayInterface');
import ProtocolConnectionManagerInterface = require('./net/interfaces/ProtocolConnectionManagerInterface');
import ProtocolConnectionManager = require('./net/ProtocolConnectionManager');
import ProxyManagerInterface = require('./proxy/interfaces/ProxyManagerInterface');
import ProxyManager = require('./proxy/ProxyManager');
import PingPongNodeUpdateHandler = require('./ping/PingPongNodeUpdateHandler');
import TCPSocketHandlerInterface = require('../net/tcp/interfaces/TCPSocketHandlerInterface');
import MyNodeInterface = require('../topology/interfaces/MyNodeInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import RoutingTableInterface = require('../topology/interfaces/RoutingTableInterface');
import FindClosestNodesManager = require('./findClosestNodes/FindClosestNodesManager');
import FindClosestNodesCycleFactory = require('./findClosestNodes/FindClosestNodesCycleFactory');
import FoundClosestNodesWritableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesWritableMessageFactory');
import FoundClosestNodesReadableMessageFactory = require('./findClosestNodes/messages/FoundClosestNodesReadableMessageFactory');


class ProtocolGateway implements ProtocolGatewayInterface {

	private _myNode:MyNodeInterface = null;
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;
	private _protocolConfig:ConfigInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _proxyManager:ProxyManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;
	private _topologyConfig:ConfigInterface = null;
	private _pingPongNodeUpdateHandler:PingPongNodeUpdateHandler = null;
	private _findClosestNodesManager:FindClosestNodesManager = null;

	constructor (protocolConfig:ConfigInterface, topologyConfig:ConfigInterface, myNode:MyNodeInterface, tcpSocketHandler:TCPSocketHandlerInterface, routingTable:RoutingTableInterface) {
		this._protocolConfig = protocolConfig;
		this._topologyConfig = topologyConfig;

		this._myNode = myNode;
		this._tcpSocketHandler = tcpSocketHandler;
		this._routingTable = routingTable;

		// build up the ProtocolConnectionManager
		this._protocolConnectionManager = new ProtocolConnectionManager(this._protocolConfig, this._myNode, this._tcpSocketHandler);

		// build up the ProxyManager
		this._proxyManager = new ProxyManager(this._protocolConfig, this._protocolConnectionManager, this._routingTable);

		// build up the PingPongNodeUpdateHandler
		this._pingPongNodeUpdateHandler = new PingPongNodeUpdateHandler(this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable);

		// build up the FindClosestNodeManager
		var findClosestNodesCycleFactory:FindClosestNodesCycleFactory = new FindClosestNodesCycleFactory(this._myNode, this._protocolConnectionManager);
		var foundClosestNodesWritableMessageFactory:FoundClosestNodesWritableMessageFactory = new FoundClosestNodesWritableMessageFactory();
		var foundClosestNodesReadableMessageFactory:FoundClosestNodesReadableMessageFactory = new FoundClosestNodesReadableMessageFactory();

		this._findClosestNodesManager = new FindClosestNodesManager(this._topologyConfig, this._protocolConfig, this._myNode, this._protocolConnectionManager, this._proxyManager, this._routingTable, findClosestNodesCycleFactory, foundClosestNodesWritableMessageFactory, foundClosestNodesReadableMessageFactory);
	}

	/**
	 * When kicking off everything, it should check if it has any items in the routing table.
	 * if not, the ContactServer should be queried for a contact node, which is then added to the routing table.
	 * then, the proxymanager is kicked off, and find_closest_nodes queries are fired off to the contact node to
	 * quickly populate the routing table.
	 *
	 * if it does have entries in the routing table, but all find_closest_nodes queries result in nothing,
	 * it also queries the ContactServer for a contact node, which is then added to the routing table and
	 * used for populating it.
	 *
	 * this is repeated until a find_closest_nodes query succeeds
	 *
	 */



}

export = ProtocolGateway;