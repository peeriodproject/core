/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

interface TCPSocketOptions {

	/**
	 * Indicates whether keep-alive functionality should be enabled/disabled on socket.
	 */
	doKeepAlive:boolean;

	/**
	 * Number of seconds to wait until an idle socket will be closed.
	 * If idle socket should not be closed, set to 0 or below.
	 */
	idleConnectionKillTimeout:number;

	/**
	 * Delay between last data packet received and the first keepalive probe. 0 leaves the value unchanged
	 * from default (or previous) setting.
	 */
	keepAliveDelay?:number;
}

/**
 * TCPSocket is a wrapper around node.js's raw net.Socket class and represents open TCP connections.
 * What it does for now is setting the keep-alive option and optionally auto-kill idle sockets, as well as
 * providing the socket with an identifier string.
 *
 * It is planned, however, to maybe automatically control the upload rate and providing statistical data.
 *
 * @interface
 * @class core.net.tcp.TCPSocketInterface
 */
interface TCPSocketInterface {

	/**
	 * Returns the identification string.
	 *
	 * @returns {string} identifier
	 */
	getIdentifier():string;

	/**
	 * Returns a string representation of the remote connection in the form IP:PORT
	 *
	 * @returns {string} IP:PORT
	 */
	getIPPortString():string;

	/**
	 * Returns the net.Socket instance.
	 *
	 * @returns {net.Socket} net.Socket instance
	 */
	getSocket():net.Socket;

	/**
	 * Function that gets called when a `timeout` event is emitted on an idle socket.
	 */
	onTimeout():void;

	/**
	 * Sets an identification string on the socket object. Useful when trying to quickly pair a socket and some
	 * remote machine.
	 *
	 * @param {strign} identifier to set
	 */
	setIdentifier(identifier:string):void;

	/**
	 * Sets an (open) socket
	 *
	 * @param {net.Socket} socket
	 */
	setSocket(socket:net.Socket):void;

	/**
	 * Sets up the listeners on the raw socket's events and specifies the reaction.
	 * Some socket events are simply propagated, like 'data', 'close', 'error'
	 */
	setupListeners():void;

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

	 * @returns {boolean} True if flushed to kernel buffer, false if all or part was queued in memory.
	 */
	writeBuffer(buffer:NodeBuffer, callback?:Function):boolean;

	/**
	 * Writes a string to the socket.
	 *
	 * @param {string} message
	 * @param {string} encoding, default is 'utf8'
	 * @param {Function} optional callback
	 *
	 * @returns {boolean} True if flushed to kernel buffer, false if all or part was queued in memory.
	 */
	writeString(message:string, encoding?:string, callback?:Function):boolean;

}
