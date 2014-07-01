import QueryFactoryInterface = require('./interfaces/QueryFactoryInterface');
import QueryInterface = require('./interfaces/QueryInterface');
import BroadcastBasedQuery = require('./BroadcastBasedQuery');
import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import TransferMessageCenterInterface = require('../interfaces/TransferMessageCenterInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import BroadcastManagerInterface = require('../../broadcast/interfaces/BroadcastManagerInterface');

/**
 * QueryFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.QueryFactory
 * @implements core.protocol.fileTransfer.QueryFactoryInterface
 *
 * @param {core.config.ConfigInterface} transferConfig
 * @param {core.protocol.fileTransfer.TransferMessageCenterInterface} transferMessageCenter
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager
 * @oaram {core.protocoo.broadcast.BroadcastManagerInterface} broadcastManager
 */
class QueryFactory implements QueryFactoryInterface {

	/**
	 * @member {core.protocoo.broadcast.BroadcastManagerInterface} core.protocol.fileTransfer.QueryFactory~_broadcastManager
	 */
	private _broadcastManager:BroadcastManagerInterface = null;

	/**
	 * @member {number} core.protocol.fileTransfer.QueryFactory~_broadcastValidityInMs
	 */
	private _broadcastValidityInMs:number = null;

	/**
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.QueryFactory~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * @member {core.protocol.fileTransfer.TransferMessageCenterInterface} core.protocol.fileTransfer.QueryFactory~_transferMessageCenter
	 */
	private _transferMessageCenter:TransferMessageCenterInterface = null;

	public constructor (transferConfig:ConfigInterface, transferMessageCenter:TransferMessageCenterInterface, circuitManager:CircuitManagerInterface, broadcastManager:BroadcastManagerInterface) {
		this._transferMessageCenter = transferMessageCenter;
		this._circuitManager = circuitManager;
		this._broadcastManager = broadcastManager;
		this._broadcastValidityInMs = transferConfig.get('fileTransfer.query.broadcastValidityInSeconds') * 1000;
	}

	public constructBroadcastBasedQuery (searchObject:Buffer):QueryInterface {
		return new BroadcastBasedQuery(searchObject, this._transferMessageCenter, this._circuitManager, this._broadcastManager, this._broadcastValidityInMs);
	}

}

export = QueryFactory;