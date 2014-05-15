import ProtocolGatewayInterface = require('./interfaces/ProtocolGatewayInterface');
import ProtocolConnectionManagerInterface = require('./net/interfaces/ProtocolConnectionManagerInterface');
import ProtocolConnectionManager = require('./net/ProtocolConnectionManager');
import ProxyManagerInterface = require('./proxy/interfaces/ProxyManagerInterface');
import ProxyManager = require('./proxy/ProxyManager');
import TCPSocketHandlerInterface = require('../net/tcp/interfaces/TCPSocketHandlerInterface');
import MyNodeInterface = require('../topology/interfaces/MyNodeInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import RoutingTableInterface = require('../topology/interfaces/RoutingTableInterface');

class ProtocolGateway implements ProtocolGatewayInterface {


	private _myNode:MyNodeInterface = null;
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;
	private _protocolConfig:ConfigInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _proxyManager:ProxyManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;

	constructor (protocolConfig:ConfigInterface, myNode:MyNodeInterface, tcpSocketHandler:TCPSocketHandlerInterface, routingTable:RoutingTableInterface) {
		this._protocolConfig = protocolConfig;
		this._myNode = myNode;
		this._tcpSocketHandler = tcpSocketHandler;
		this._routingTable = routingTable;

		// build up the ProtocolConnectionManager
		this._protocolConnectionManager = new ProtocolConnectionManager(this._protocolConfig, this._myNode, this._tcpSocketHandler);

		// build up zhr ProxyManager
		this._proxyManager = new ProxyManager(this._protocolConfig, this._protocolConnectionManager, this._routingTable);

	}

}

export = ProtocolGateway;