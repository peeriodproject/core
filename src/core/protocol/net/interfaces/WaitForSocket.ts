/**
 * @interface
 * @class core.protocol.net.WaitForSocket
 */
interface WaitForSocket {
	index: number;
	callback: Function;
	timeout: number;
}

export = WaitForSocket;