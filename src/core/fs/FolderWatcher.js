//var monitor = require('usb-detection');
//var chokidar = require('chokidar');
/**
* @class core.fs.FolderWatcher
* @implements core.fs.FolderWatcherInterface
*/
var FolderWatcher = (function () {
    function FolderWatcher(pathToWatch) {
        this._isOpen = false;
        this._path = null;
        this._path = pathToWatch;

        this.open();
    }
    FolderWatcher.prototype.close = function () {
        this._isOpen = false;
    };

    FolderWatcher.prototype.getState = function () {
        return undefined;
    };

    FolderWatcher.prototype.isOpen = function () {
        return this._isOpen;
    };

    FolderWatcher.prototype.open = function () {
        this._isOpen = true;
    };
    return FolderWatcher;
})();

module.exports = FolderWatcher;
//# sourceMappingURL=FolderWatcher.js.map
