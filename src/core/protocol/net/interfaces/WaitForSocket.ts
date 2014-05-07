/**
 * @interface
 * @class core.protocol.net.WaitForSocket
 */
interface WaitForSocket {
	callback: Function;
	timeout: number;
}

export = WaitForSocket;