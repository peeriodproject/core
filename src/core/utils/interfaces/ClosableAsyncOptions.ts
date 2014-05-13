/**
 * @interface
 * @class core.utils.ClosableAsyncOptions
 */
interface ClosableAsyncOptions {
	closeOnProcessExit?: boolean;
	onCloseCallback?: (err:Error) => any;
	onOpenCallback?: (err:Error) => any;
}

export = ClosableAsyncOptions;