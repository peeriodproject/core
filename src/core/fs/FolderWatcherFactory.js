var FolderWatcher = require('./FolderWatcher');

/**
* @class core.fs.FolderWatcherFactory
* @implements core.fs.FolderWatcherFactory
*/
var FolderWatcherFactory = (function () {
    function FolderWatcherFactory() {
    }
    FolderWatcherFactory.prototype.create = function (pathToWatch) {
        return new FolderWatcher(pathToWatch);
    };
    return FolderWatcherFactory;
})();

module.exports = FolderWatcherFactory;
//# sourceMappingURL=FolderWatcherFactory.js.map
