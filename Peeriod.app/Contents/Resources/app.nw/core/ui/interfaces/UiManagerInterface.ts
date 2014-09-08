import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.ui.UiManagerInterface
 */
interface UiManagerInterface extends ClosableAsyncInterface {

	/**
	 * Returns the socket server instance.
	 *
	 * CAUTION: the socket server is only exposed for socket testing and should return null outside the test environment
	 *
	 * @method core.ui.UiManagerInterface#getSocketServer
	 */
	getSocketServer ():any;
}

export = UiManagerInterface;