import events = require('events');

import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraConnectionManagerInterface = require('./interfaces/HydraConnectionManagerInterface');
import ReadableHydraMessageInterface = require('./messages/interfaces/ReadableHydraMessageInterface');

class HydraMessageCenter extends events.EventEmitter implements HydraMessageCenterInterface {

	_connectionManager:HydraConnectionManagerInterface = null;

	public constructor (connectionManager:HydraConnectionManagerInterface) {
		super();

		this._connectionManager = connectionManager;

		this._setupListeners();
	}

	private _onMessage (ip:string, message:ReadableHydraMessageInterface):void {
		var circuitId:string = message.getCircuitId();

		if (circuitId) {
			this.emit(circuitId, ip, message);
		}
		else {
			if (message.getMessageType() === 'ADDITIVE_SHARING') {
				this._connectionManager.pipeMessage('CREATE_CELL_ADDITIVE', message.getPayload(), {ip:ip});
			}
			else if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
				this.emit('createCellAdditiveMessage', message);
			}
		}
	}

	private _setupListeners ():void {
		this._connectionManager.on('hydraMessage', (ip:string, msg:ReadableHydraMessageInterface) => {
			this._onMessage(ip, msg);
		});
	}

}

export = HydraMessageCenter;

