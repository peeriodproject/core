/**
 * @interface
 * @class core.topology.RoutingTableOptions
 */
interface RoutingTableOptions {
	closeOnProcessExit?: boolean;
	onCloseCallback?: (err:Error) => any;
	onOpenCallback?: (err:Error) => any;
}

export = RoutingTableOptions;