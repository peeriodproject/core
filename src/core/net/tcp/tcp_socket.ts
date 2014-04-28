/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 *
 * @namespace net/tcp#
 *
 * The class TCPSocket is a wrapper around node.js's raw net.Socket class and represents open tcp connections.
 * What it does for now is setting the keep-alive option and optionally auto-kill idle sockets.
 *
 * It is planned, however, to maybe automatically control the upload rate and providing statistical data.
 *
 * @todo proper error handling (currently only logging out errors)
 */

import net 		= require('net');
import events 	= require('events');

export interface TCPSocketOptions {
	/**
	 * Number of seconds to wait until an idle socket will be closed.
	 * If idle socket should not be closed, set to 0 or below.
	 */
	idle_connection_kill_timeout:number;

	/**
	 * Indicates whether keep-alive functionality should be enabled/disabled on socket.
	 */
	do_keep_alive:boolean;

	/**
	 * Delay between last data packet received and the first keepalive probe. 0 leaves the value unchanged
	 * from default (or previous) setting.
	 */
	keep_alive_delay?:number;
}

export interface TCPSocketInterface {

	/**
	 * Sets an (open) socket
	 * @param socket
	 */
	setSocket(socket:net.Socket):void;

	/**
	 * Returns the socket.
	 * @return net.Socket
	 */
	getSocket():net.Socket;

	/**
	 * Sends a byte buffer on the socket.
	 * Returns `true` if the entire data was successfully flushed to the kernel buffer. Returns `false` if all or
	 * part of the data was queued in user memory. The socket emits `drain` when the buffer is again free.
	 *
	 * To avoid unnecessary memory retention and to let garbage collection know that the buffer
	 * is no longer needed, keep in mind to set the buffer to `null` as soon as possible.
	 *
	 * Optional `callback` will be executed when the data is finally written out - this may not be immediately.
	 *
	 * @param {NodeBuffer} buffer
	 * @param {Function} callback
	 * @param {boolean} keep_reference
	 * @return boolean
	 * @see http://nodejs.org/api/net.html#net_socket_write_data_encoding_callback
	 */
	writeBuffer(buffer:NodeBuffer, callback?:Function):boolean;

	/**
	 *
	 * @param message
	 * @param encoding
	 * @param callback
	 */
	writeString(message:string, encoding?:string, callback?:Function):boolean;

	/**
	 * Function that gets called when a `timeout` event is emitted on an idle socket.
	 */
	onTimeout():void;

	/**
	 * Sets up the listeners on the raw socket's events and specifies the reaction.
	 * Some socket events are simply propagated.
	 */
	setupListeners():void;

	/**
	 * Returns a string representation of the remote connection in the form IP:PORT
	 */
	getIPPortString():string;
}

export class TCPSocket extends events.EventEmitter implements TCPSocketInterface {

	private socket:net.Socket = null;
	private closeOnTimeout:boolean = false;
	private eventsToPropagate:Array<string> = ['data', 'close', 'error'];

	/**
	 * Takes an array of event names and propagates the corresponding node.js's net.Socket events,
	 * so that the raw socket doesn't have to be accessed.
	 *
	 * @param events
	 */
	private propagateEvents(events:Array<string>):void {
		events.forEach((event) => {
			((evt) => {
				this.getSocket().on(evt, () => this.emit.apply(this, [evt].concat(Array.prototype.splice.call(arguments, 0))));
			})(event);
		});
	}

	public constructor(socket:net.Socket, opts:TCPSocketOptions) {
		super();

		this.setSocket(socket);

		// set keep-alive
		if (opts.do_keep_alive) {
			this.getSocket().setKeepAlive(true, opts.keep_alive_delay || 0);
		}

		// set the timeout
		if (opts.idle_connection_kill_timeout > 0) {
			this.closeOnTimeout = true;
			this.getSocket().setTimeout(opts.idle_connection_kill_timeout * 1000);
		}

		this.setupListeners();
	}

	public setupListeners():void {
		var socket = this.getSocket();
		socket.on('timeout', () => this.onTimeout());

		socket.on('error', function (error) {
			console.log(error);
		});

		this.propagateEvents(this.eventsToPropagate);
	}

	public setSocket(socket:net.Socket) {
		this.socket = socket;
	}

	public getSocket():net.Socket {
		if (!this.socket) throw new Error('TCPSocket: getSocket() called, but no socket set on this connection!');

		return this.socket;
	}

	public end(data?:any, encoding?:string) {
		this.getSocket().end(data, encoding);
	}

	public getIPPortString():string {
		var socket = this.getSocket();
		return socket.remoteAddress + ':' + socket.remotePort;
	}

	public writeBuffer(buffer:NodeBuffer, callback?:Function):boolean {
		var success = this.getSocket().write(buffer, callback);
		buffer = null;

		return success;
	}

	public writeString(message:string, encoding:string = 'utf8', callback?:Function):boolean {
		return this.getSocket().write(message, encoding, callback);
	}

	public onTimeout():void {
		if (this.closeOnTimeout) this.getSocket().end();
	}
}