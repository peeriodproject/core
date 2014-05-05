import events = require('events');

import ProtocolConnectionManagerInterface = require('./interfaces/ProtocolConnectionManagerInterface');
import ReadableMessageFactoryInterface = require('./messages/interfaces/ReadableMessageFactoryInterface');
import ReadableMessageInterface = require('./messages/interfaces/ReadableMessageInterface');
import TCPSocketHandlerInterface = require('../net/tcp/interfaces/TCPSocketHandlerInterface');
import TCPSocketInterface = require('../net/tcp/interfaces/TCPSocketInterface');

/**
 * @class core.protocol.ProtocolConnectionManager
 *
 * @extends events.EventEmitter
 * @implements core.protocol.ProtocolConnectionManagerInterface
 *
 */
class ProtocolConnectionManager extends events.EventEmitter implements ProtocolConnectionManagerInterface {

	private _tcpSocketHandler:TCPSocketHandlerInterface = null;
	private _readableMessageFactory:ReadableMessageFactoryInterface = null;

	constructor (tcpSocketHandler:TCPSocketHandlerInterface, readableMessageFactory:ReadableMessageFactoryInterface) {
		super();

		this._tcpSocketHandler = tcpSocketHandler;
		this._readableMessageFactory = readableMessageFactory;
	}
}

export = ProtocolConnectionManager;