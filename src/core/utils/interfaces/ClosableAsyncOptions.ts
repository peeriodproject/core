/**
 * @interface
 * @class core.utils.ClosableAsyncOptions
 */
interface ClosableAsyncOptions {
	onCloseCallback?: (err:Error) => any;
	onOpenCallback?: (err:Error) => any;
}

export = ClosableAsyncOptions;