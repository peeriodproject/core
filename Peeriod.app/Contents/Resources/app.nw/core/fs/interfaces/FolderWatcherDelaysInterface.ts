/**
 * This interface contains the different delays for how long the timer should wait before emitting the file event.
 *
 * @interface
 * @class core.fs.FolderWatcherDelaysInterface
 */
interface FolderWatcherDelaysInterface {
	interval:number;
	binaryInterval:number;
	eventDelay:number;
}

export = FolderWatcherDelaysInterface;