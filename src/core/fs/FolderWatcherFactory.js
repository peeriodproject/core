var FolderWatcher = require('./FolderWatcher');

/**
* @class core.fs.FolderWatcherFactory
* @implements core.fs.FolderWatcherFactory
*/
var FolderWatcherFactory = (function () {
    function FolderWatcherFactory() {
    }
    FolderWatcherFactory.prototype.create = function (config, pathToWatch) {
        return new FolderWatcher(config, pathToWatch);
    };
    return FolderWatcherFactory;
})();

module.exports = FolderWatcherFactory;
//# sourceMappingURL=FolderWatcherFactory.js.map
