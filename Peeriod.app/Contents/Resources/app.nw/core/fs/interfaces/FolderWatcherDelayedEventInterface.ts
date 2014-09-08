/**
 * @interface
 * @class core.fs.FolderWatcherDelayedEventInterface
 */
interface FolderWatcherDelayedEventInterface {
	eventName:string;
	initialEventName:string;
	isEmptyFile:boolean;
	timeout:number;
	fileSize:number;
}

export = FolderWatcherDelayedEventInterface;