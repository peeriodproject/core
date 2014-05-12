import ProtocolGatewayInterface = require('./interfaces/ProtocolGatewayInterface');
import TCPSocketHandlerInterface = require('../net/tcp/interfaces/TCPSocketHandlerInterface');
import MyNodeInterface = require('../topology/interfaces/MyNodeInterface');

class ProtocolGateway implements ProtocolGatewayInterface {


	private _myNode:MyNodeInterface = null;
	private _tcpSocketHandler:TCPSocketHandlerInterface = null;

	constructor (myNode:MyNodeInterface, tcpSocketHandler:TCPSocketHandlerInterface) {
		this._myNode = myNode;
		this._tcpSocketHandler = tcpSocketHandler;
	}

}

export = ProtocolGateway;