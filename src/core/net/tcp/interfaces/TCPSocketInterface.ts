/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

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
interface TCPSocketInterface extends NodeJS.EventEmitter {

	/**
	 * Manually close a socket, i.e. send a FIN packet. The other end may be able to still send data though.
	 *
	 * @method core.net.tcp.TCPSocketInterface#end
	 *
	 * @param data Data to finally send.
	 * @param encoding Optional encoding. Will default to utf8 if `data` is a string.
	 */
	end (data?:any, encoding?:string):void;

	/**
	 * Returns the identification string.
	 *
	 * @method core.net.tcp.TCPSocketInterface#getIdentifier
	 *
	 * @returns {string} identifier
	 */
	getIdentifier ():string;

	/**
	 * Returns the string representation of the remote IP.
	 *
	 * @method core.net.tcp.TCPSocketInterface#getIP
	 *
	 * @returns {string} The remote IP of the socket.
	 */
	getIP ():string;

	/**
	 * Returns a string representation of the remote connection in the form IP:PORT
	 *
	 * @method core.net.tcp.TCPSocketInterface#getIPPortString
	 *
	 * @returns {string} IP:PORT
	 */
	getIPPortString ():string;

	/**
	 * Returns the net.Socket instance.
	 *
	 * @method core.net.tcp.TCPSocketInterface#getSocket
	 *
	 * @returns {net.Socket} net.Socket instance
	 */
	getSocket ():net.Socket;

	/**
	 * Function that gets called when a `timeout` event is emitted on an idle socket.
	 *
	 * @method core.net.tcp.TCPSocketInterface#onTimeout
	 */
	onTimeout ():void;

	/**
	 * Specify if an idle socket should be closed on a `timeout` event.
	 *
	 * @method core.net.tcp.TCPSocketInterface#setCloseOnTimeout
	 *
	 * @param {boolean} flag
	 */
	setCloseOnTimeout (flag:boolean):void;

	/**
	 * Sets an identification string on the socket object. Useful when trying to quickly pair a socket and some
	 * remote machine.
	 *
	 * @method core.net.tcp.TCPSocketInterface#setIdentifier
	 *
	 * @param {string} identifier Identifier to set
	 */
	setIdentifier (identifier:string):void;

	/**
	 * Sets an (open) socket
	 *
	 * @method core.net.tcp.TCPSocketInterface#setSocket
	 *
	 * @param {net.Socket} socket
	 */
	setSocket (socket:net.Socket):void;

	/**
	 * Sets up the listeners on the raw socket's events and specifies the reaction.
	 * Some socket events are also propagated, like 'data', 'close', 'error', 'end'
	 *
	 * @method core.net.tcp.TCPSocketInterface#setupListeners
	 */
	setupListeners ():void;

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
	 * @method core.net.tcp.TCPSocketInterface#writeBuffer
	 *
	 * @param {NodeBuffer} buffer
	 * @param {Function} callback
	 * @returns {boolean} True if flushed to kernel buffer, false if all or part was queued in memory.
	 */
	writeBuffer (buffer:NodeBuffer, callback?:Function):boolean;

	/**
	 * Writes a string to the socket.
	 *
	 * @method core.net.tcp.TCPSocketInterface#writeString
	 *
	 * @param {string} message
	 * @param {string} encoding Optional. Defaults to 'utf8'
	 * @param {Function} callback Optional
	 * @returns {boolean} True if flushed to kernel buffer, false if all or part was queued in memory.
	 */
	writeString (message:string, encoding?:string, callback?:Function):boolean;

}

export = TCPSocketInterface;