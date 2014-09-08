import CircuitExtenderFactoryInterface = require('./interfaces/CircuitExtenderFactoryInterface');
import CircuitExtenderInterface = require('./interfaces/CircuitExtenderInterface');
import CircuitExtender = require('./CircuitExtender');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import LayeredEncDecHandlerInterface = require('./messages/interfaces/LayeredEncDecHandlerInterface');

/**
 * CircuitExtenderFactoryInterface implementation.
 *
 * @class core.protocol.hydra.CircuitExtenderFactory
 * @implements @class core.protocol.hydra.CircuitExtenderFactoryInterface
 *
 * @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
 * @oaran {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
 */
class CircuitExtenderFactory implements CircuitExtenderFactoryInterface {

	/**
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.CircuitExtenderFactory~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.CircuitExtenderFactory~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	public constructor (connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface) {
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
	}

	public create (reactionTimeInMs:number, reactionTimeFactor:number, encDecHandler:LayeredEncDecHandlerInterface):CircuitExtenderInterface {
		return new CircuitExtender(reactionTimeInMs, reactionTimeFactor, this._connectionManager, this._messageCenter, encDecHandler);
	}
}

export = CircuitExtenderFactory;