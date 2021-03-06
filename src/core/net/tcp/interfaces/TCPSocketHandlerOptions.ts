/**
 * @interface
 * @class core.net.tcp.TCPSocketHandlerOptions
 */
interface TCPSocketHandlerOptions {

	/**
	 * Indicates whether a socket should not send a FIN packet when the other side sends a FIN packet
	 * (thus being 'half-open')
	 *
	 * Defaults to false.
	 */
	allowHalfOpenSockets?:boolean;

	/**
	 * Indicates the number of seconds to wait until a server tries to listen on a used port again.
	 *
	 * Default is 3. If no retry should be triggered, provide a negative number.
	 *
	 */
	connectionRetry?:number;

	/**
	 * For a "regular" connection (i.e. not a connection which serves as a proxy), how many seconds should be waited
	 * after the last activity until the socket connection is killed from this side.
	 *
	 * If idle sockets should not be closed, set to 0 or below.
	 *
	 */
	idleConnectionKillTimeout:number;

	/**
	 * Number of seconds to wait on from the last sent data
	 * until a heartbeat is sent.
	 */
	heartbeatTimeout:number;

	/**
	 * The external IP address of the computer.
	 */
	myExternalIp:string;

	maxReachableTries?:number;

	/**
	 * An array of open ports under which the computer can be reached from outside.
	 */
	myOpenPorts?:Array<number>;

	/**
	 * Indicates the number of milliseconds which must pass until an outbound socket which has not emitted a `connected` event
	 * is considered as unsuccessful.
	 *
	 */
	outboundConnectionTimeout?:number;

	/**
	 * Milliseconds to simulate a Round Trip Time. Used to artificially delay socket writes.
	 */
	simulatorRTT?:number;
}

export = TCPSocketHandlerOptions;