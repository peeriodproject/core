import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import ShareMessengerFactoryInterface = require('./interfaces/ShareMessengerFactoryInterface');
import ShareMessengerInterface = require('./interfaces/ShareMessengerInterface');
import ShareMessenger = require('./ShareMessenger');

/**
 * ShareMessengerFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ShareMessengerFactory
 * @implements core.protocol.fileTransfer.share.ShareMessengerFactoryInterface
 *
 * @param {core.config.ConfigInterface} fileTransferConfig
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
 */
class ShareMessengerFactory implements ShareMessengerFactoryInterface {

	/**
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.share.ShareMessengerFactory~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * @member {core.config.ConfigInterface} core.protocol.fileTransfer.share.ShareMessengerFactory~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.share.ShareMessengerFactory~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	public constructor (fileTransferConfig:ConfigInterface, circuitManager:CircuitManagerInterface, transferMessageCenter:TransferMessageCenterInterface) {
		this._config = fileTransferConfig;
		this._circuitManager = circuitManager;
		this._transferMessageCenter = transferMessageCenter;
	}

	public createMessenger ():ShareMessengerInterface {
		return new ShareMessenger(this._config, this._circuitManager, this._transferMessageCenter);
	}
}

export = ShareMessengerFactory;