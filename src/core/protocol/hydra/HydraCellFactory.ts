import HydraCellFactoryInterface = require('./interfaces/HydraCellFactoryInterface');
import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraCell = require('./HydraCell');
import ReadableDecryptedMessageFactoryInterface = require('./messages/interfaces/ReadableDecryptedMessageFactoryInterface');
import WritableEncryptedMessageFactoryInterface = require('./messages/interfaces/WritableEncryptedMessageFactoryInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');

/**
 * HydraCellFactoryInterface implementation.
 *
 * @class core.protocol.hydra.HydraCellFactory
 * @implements core.protocol.hydra.HydraCellFactoryInterface
 *
 * @param {core.protocol.hydra.ConnectionManagerInterface} connectionManager
 * @param {core.protocol.hydra.HydraMessageCenterInterface} messageCenter
 * @param {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} decryptionFactory
 * @param {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} encryptionFactory
 */
class HydraCellFactory implements HydraCellFactoryInterface {

	/**
	 * @member {core.config.ConfigInterface} core.protocol.hydra.HydraCellFactory~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.HydraCellFactory~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.hydra.ReadableDecryptedMessageFactoryInterface} core.protocol.hydra.HydraCellFactory~_decryptionFactory
	 */
	private _decryptionFactory:ReadableDecryptedMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.WritableEncryptedMessageFactoryInterface} core.protocol.hydra.HydraCellFactory~_encryptionFactory
	 */
	private _encryptionFactory:WritableEncryptedMessageFactoryInterface = null;

	/**
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.HydraCellFactory~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	public constructor (hydraConfig:ConfigInterface, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, decryptionFactory:ReadableDecryptedMessageFactoryInterface, encryptionFactory:WritableEncryptedMessageFactoryInterface) {
		this._config = hydraConfig;
		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
		this._decryptionFactory = decryptionFactory;
		this._encryptionFactory = encryptionFactory;
	}

	public create (predecessorNode:HydraNode):HydraCellInterface {
		return new HydraCell(predecessorNode, this._config, this._connectionManager, this._messageCenter, this._decryptionFactory, this._encryptionFactory);
	}

}

export = HydraCellFactory;