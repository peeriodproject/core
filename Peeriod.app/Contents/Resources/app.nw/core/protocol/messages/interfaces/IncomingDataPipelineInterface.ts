/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');
import ReadableMessageInterface = require('./ReadableMessageInterface');

/**
 * IncomingDataPipeline has one objective: emitting out full protocol messages.
 * Thus a TCPSocket can be hooked to the pipeline. The pipeline will listen to the `data` event and try to make a
 * ReadableMessage out of the buffers. It handles memory issues and trys to avoid memory congestion by dereferencing the
 * buffers if a possible message exceeds a certain limit.
 *
 * When the pipeline has a full message, it emits a `message` event with the socket's identifier
 * and the readable message as parameter.
 *
 * @interface
 * @class core.protocol.messages.IncomingDataPipelineInterface
 * @extends events.eventEmitter
 */
interface IncomingDataPipelineInterface extends NodeJS.EventEmitter {

	/**
	 * Deformats a buffer with the class's ReadableMessageFactoryInterface and returns the result.
	 * If the passed buffer cannot be read properly. `undefined` is returned.
	 *
	 * @method core.protocol.messages.IncomingDataPipelineInterface#deformatBuffer
	 *
	 * @param {Buffer} buffer
	 * @returns core.protocol.messages.ReadableMessageInterface
	 */
	deformatBuffer (buffer:Buffer):ReadableMessageInterface;

	/**
	 * Hook a TCP socket to the pipeline, letting it listen on the `data` event.
	 * Socket must have an identifier.
	 *
	 * @method core.protocol.messages.IncomingDataPipelineInterface#hookSocket
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 */
	hookSocket (socket:TCPSocketInterface):void;

	/**
	 * Unhooks a TCP socket from the pipeline, removing the `data`-listener.
	 * The socket must have an identifier obviously.
	 *
	 * @method core.protocol.messages.IncomingDataPipelineInterface#unhookSocket
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 */
	unhookSocket (socket:TCPSocketInterface):boolean;
}

export = IncomingDataPipelineInterface;