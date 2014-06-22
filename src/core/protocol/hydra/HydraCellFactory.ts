import HydraCellFactoryInterface = require('./interfaces/HydraCellFactoryInterface');
import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraCell = require('./HydraCell');

/**
 * HydraCellFactoryInterface implementation.
 *
 * @class core.protocol.hydra.HydraCellFactory
 * @implements core.protocol.hydra.HydraCellFactoryInterface
 *
 * @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
 * @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
 */
class HydraCellFactory implements HydraCellFactoryInterface {

	/**
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCellFactory~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCellFactory~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	public constructor (connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface) {
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
	}

	public create (predecessorNode:HydraNode):HydraCellInterface {
		return new HydraCell(predecessorNode, this._connectionManager, this._messageCenter);
	}

}

export = HydraCellFactory;