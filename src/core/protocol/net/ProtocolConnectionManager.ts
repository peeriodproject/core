import events = require('events');

import ObjectConfig = require('../../config/ObjectConfig');
import ProtocolConnectionManagerInterface = require('./interfaces/ProtocolConnectionManagerInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import ReadableMessageFactory = require('./../messages/ReadableMessageFactory');
import TCPSocketHandlerInterface = require('../../net/tcp/interfaces/TCPSocketHandlerInterface');
import TCPSocketInterface = require('../../net/tcp/interfaces/TCPSocketInterface');
import MessageByteCheatsheet = require('./../messages/MessageByteCheatsheet');
import IncomingDataPipelineInterface = require('./../messages/interfaces/IncomingDataPipelineInterface');
import IncomingDataPipeline = require('./../messages/IncomingDataPipeline');
import IncomingPendingSocket = require('./interfaces/IncomingPendingSocket');
import IncomingPendingSocketList = require('./interfaces/IncomingPendingSocketList');
import OutgoingPendingSocket = require('./interfaces/OutgoingPendingSocket');
import OutgoingPendingSocketList = require('./interfaces/OutgoingPendingSocketList');
import ConfirmedSocket = require('./interfaces/ConfirmedSocket');
import ConfirmedSocketList = require('./interfaces/ConfirmedSocketList');


/**
 * @class core.protocol.ProtocolConnectionManager
 *
 * @extends events.EventEmitter
 * @implements core.protocol.ProtocolConnectionManagerInterface
 *
 */
class ProtocolConnectionManager extends events.EventEmitter implements ProtocolConnectionManagerInterface {

	private _temporaryIdentifierPrefix = '_temp';
	private _temporaryIdentifierCount:number = 0;

	private _tcpSocketHandler:TCPSocketHandlerInterface = null;

	private _confirmedSockets:ConfirmedSocketList = {};
	private _outgoingPendingSockets:OutgoingPendingSocketList = {};
	private _incomingPendingSockets:IncomingPendingSocketList = {};

	private _incomingDataPipeline:IncomingDataPipelineInterface = null;

	constructor (config:ObjectConfig, tcpSocketHandler:TCPSocketHandlerInterface) {
		super();

		this._tcpSocketHandler = tcpSocketHandler;

		this._incomingDataPipeline = new IncomingDataPipeline(
			config.get('protocol.messages.maxByteLengthPerMessage'),
			MessageByteCheatsheet.messageEnd,
			config.get('prococol.messages.msToKeepNonAddressableMemory'),
			new ReadableMessageFactory()
		);

		this._tcpSocketHandler.on('connected', (socket:TCPSocketInterface, direction:string) => {
			if (direction === 'incoming') {
				this._onIncomingConnection(socket);
			}
		});

	}

	private _onIncomingConnection(socket:TCPSocketInterface):void {
		this._setTemporaryIdentifier(socket);

	}

	private _setTemporaryIdentifier(socket:TCPSocketInterface):void {
		socket.setIdentifier(this._temporaryIdentifierPrefix + (++this._temporaryIdentifierCount));
	}

}

export = ProtocolConnectionManager;