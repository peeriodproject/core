import FolderWatcherInterface = require('./interfaces/FolderWatcherInterface');

//var monitor = require('usb-detection');
//var chokidar = require('chokidar');

/**
 * @class core.fs.FolderWatcher
 * @implements core.fs.FolderWatcherInterface
 */
class FolderWatcher implements FolderWatcherInterface {
	private _isOpen:boolean = false;

	private _path:string = null;

	constructor (pathToWatch:string) {
		this._path = pathToWatch;

		this.open();
	}

	public close ():void {
		this._isOpen = false;
	}

	getState ():any {
		return undefined;
	}

	public isOpen ():boolean {
		return this._isOpen;
	}

	public open ():void {
		this._isOpen = true;
	}

}

export = FolderWatcher;