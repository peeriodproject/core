/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * IncomingDataPipeline has one objective: emitting out full protcol messages.
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
	 * Hook a TCP socket to the pipeline, letting it listen on the `data` event.
	 * Socket must have an identifier.
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 */
	hookSocket (socket:TCPSocketInterface):void;

	/**
	 * Unhooks a TCP socket from the pipeline, removing the `data`-listener.
	 * The socket must have an identifier obviously.
	 *
	 * @param {core.net.tcp.TCPSocketInterface} socket
	 */
	unhookSocket (socket:TCPSocketInterface):boolean;
}

export = IncomingDataPipelineInterface;