/**
 * @interface
 * @class core.net.tcp.TCPSocketOptions
 */
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

	/**
	 * Milliseconds to simulate a Round Trip Time. Used to artificially delay socket writes.
	 */
	simulatorRTT?:number;

}

export = TCPSocketOptions;