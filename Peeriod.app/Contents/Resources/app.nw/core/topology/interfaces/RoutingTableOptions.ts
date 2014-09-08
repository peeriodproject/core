import ClosableAsyncOptions = require('../../utils/interfaces/ClosableAsyncOptions');

/**
 * @interface
 * @class core.topology.RoutingTableOptions
 */
interface RoutingTableOptions extends ClosableAsyncOptions {
	closeOnProcessExit?: boolean;
}

export = RoutingTableOptions;