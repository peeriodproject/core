import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface');

/**
 * @interface
 * @class core.ui.UiManagerInterface
 */
interface UiManagerInterface extends ClosableAsyncInterface {

	/**
	 * Returns the socket server instance.
	 *
	 * CAUTION: this is only exposed for socket testing
	 */
	getSocketServer ():any;
}

export = UiManagerInterface;