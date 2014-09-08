import ClosableOptions = require('./ClosableOptions');

/**
 * @interface
 * @class core.utils.ClosableAsyncOptions
 */
interface ClosableAsyncOptions extends ClosableOptions {
	onCloseCallback?: (err:Error) => any;
	onOpenCallback?: (err:Error) => any;
}

export = ClosableAsyncOptions;