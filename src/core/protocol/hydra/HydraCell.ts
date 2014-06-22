import events = require('events');

import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraNode = require('./interfaces/HydraNode');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');

class HydraCell extends events.EventEmitter implements HydraCellInterface {

	private _connectionManager:ConnectionManagerInterface = null;
	private _messageCenter:HydraMessageCenterInterface = null;

	private _predecessor:HydraNode = null;

	public constructor (predecessorNode:HydraNode, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface) {
		super();

		this._predecessor = predecessorNode;

		this._connectionManager = connectionManager;
		this._messageCenter = messageCenter;
	}
}

export = HydraCell;