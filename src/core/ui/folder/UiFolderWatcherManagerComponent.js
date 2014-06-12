/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/**
* The UiFolderWatcherManagerComponent acts as a controller between the {@link core.fs.FolderWatcherManager} and the user interface.
*
*
* @class core.ui.UiFolderWatcherManagerComponent
* @implements core.ui.UiComponentInterface
*
* @param {core.fs.FolderWatcherManagerInterface} folderWatcherManager
*/
var UiFolderWatcherManagerComponent = (function () {
    function UiFolderWatcherManagerComponent(folderWatcherManager) {
        /**
        * todo ts-definition
        */
        this._connections = [];
        /**
        * The folder watcher manager instance
        *
        * @member {core.fs.FolderWatcherManagerInterface} core.ui.UiFolderWatcherManagerComponent~_folderWatcherManager
        */
        this._folderWatcherManager = null;
        /**
        * The map of currently known folders
        *
        * @member {core.ui.folder.UiFolderMapInterface} core.ui.UiFolderWatcherManagerComponent~_folders
        */
        this._folders = {};
        this._folderWatcherManager = folderWatcherManager;

        this._setupFolderWatcherEvents();
        this._setupItemEvents();
    }
    UiFolderWatcherManagerComponent.prototype.getChannelName = function () {
        return 'folder';
    };

    UiFolderWatcherManagerComponent.prototype.getState = function () {
        var keys = Object.keys(this._folders);
        var folders = [];

        for (var j in keys) {
            folders.push(this._folders[keys[j]]);
        }

        return folders;
    };

    UiFolderWatcherManagerComponent.prototype.onConnection = function (spark) {
        var _this = this;
        this._connections.push(spark);

        spark.on('addFolder', function (path) {
            _this._folderWatcherManager.addFolderWatcher(path);
        });
    };

    /**
    * Adds a folder to the folders list
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_createFolder
    *
    * @param {string} path
    * @param {string} status the folder status (optional)
    */
    UiFolderWatcherManagerComponent.prototype._createFolder = function (path, status) {
        if (typeof status === "undefined") { status = 'active'; }
        if (!this._folderExists(path)) {
            this._folders[path] = {
                items: 0,
                name: this._getFolderName(path),
                path: path,
                status: status
            };
        }
    };

    /**
    * Increments the item count for the corresponding folder
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_addItem
    *
    * @param {string} path
    */
    UiFolderWatcherManagerComponent.prototype._addItem = function (path) {
        var folderPath = this._getFolderPathForItem(path);

        this._folders[folderPath].items++;
    };

    /**
    * Returns `true` if the folder exists in the folder list.
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_folderExists
    *
    * @param {string} path
    */
    UiFolderWatcherManagerComponent.prototype._folderExists = function (path) {
        return this._folders[path] ? true : false;
    };

    /**
    * Extracts and returns the folder name from the given path
    *
    * todo add windows path seperator switch
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_getFolderName
    *
    * @param {string} path
    * @returns {string}
    */
    UiFolderWatcherManagerComponent.prototype._getFolderName = function (path) {
        return path.split('/').pop();
    };

    /**
    * Returns the folder path of the folder which contains the specified item
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_getFolderPathForItem
    *
    * @param {string} itemPath
    * @returns {string}
    */
    UiFolderWatcherManagerComponent.prototype._getFolderPathForItem = function (itemPath) {
        var folderPaths = Object.keys(this._folders);
        var folderPath = '';

        folderPaths.sort();
        folderPaths.reverse();

        for (var i in folderPaths) {
            var path = folderPaths[i];

            if (itemPath.indexOf(path) === 0) {
                folderPath = path;
                break;
            }
        }

        return folderPath;
    };

    /**
    * Removes the specified path from the folder list
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_removeFolder
    *
    * @param {string} path
    */
    UiFolderWatcherManagerComponent.prototype._removeFolder = function (path) {
        delete this._folders[path];
    };

    /**
    * Decrements the item count for th corresponding folder
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_removeItem
    *
    * @param {stirng} path
    */
    UiFolderWatcherManagerComponent.prototype._removeItem = function (path) {
        var folderPath = this._getFolderPathForItem(path);

        this._folders[folderPath].items--;
    };

    /**
    * Registers listeners for folder changes on the {@link core.ui.UiFolderWatcherManagerComponent~_folderWatcherManager}
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_setupFolderWatcherEvents
    */
    UiFolderWatcherManagerComponent.prototype._setupFolderWatcherEvents = function () {
        var _this = this;
        this._folderWatcherManager.on('watcher.add', function (path) {
            _this._setStatus(path, 'active');
            _this._updateUi();
        });
        this._folderWatcherManager.on('watcher.invalid', function (path) {
            _this._setStatus(path, 'invalid');
            _this._updateUi();
        });
        this._folderWatcherManager.on('watcher.remove', function (path) {
            _this._removeFolder(path);
            _this._updateUi();
        });
    };

    /**
    * Registers listeners for item changes on the {@link core.ui.UiFolderWatcherManagerComponent~_folderWatcherManager}
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_setupItemEvents
    */
    UiFolderWatcherManagerComponent.prototype._setupItemEvents = function () {
        var _this = this;
        this._folderWatcherManager.on('add', function (path) {
            _this._addItem(path);
            _this._updateUi();
        });

        this._folderWatcherManager.on('unlink', function (path) {
            _this._removeItem(path);
            _this._updateUi();
        });
    };

    /**
    * Sets the status of the folder
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_setStatus
    *
    * @param {string} path
    * @param {string} status
    */
    UiFolderWatcherManagerComponent.prototype._setStatus = function (path, status) {
        if (!this._folderExists(path)) {
            this._createFolder(path, status);
        } else {
            this._folders[path].status = status;
        }
    };

    /**
    * Sends the updates to all connected clients via `update` message.
    *
    * @member core.ui.UiFolderWatcherManagerComponent~_updateUi
    */
    UiFolderWatcherManagerComponent.prototype._updateUi = function () {
        if (this._connections.length) {
            var state = this.getState();

            for (var i in this._connections) {
                this._connections[i].send('update', state);
            }
        }
    };
    return UiFolderWatcherManagerComponent;
})();

module.exports = UiFolderWatcherManagerComponent;
//# sourceMappingURL=UiFolderWatcherManagerComponent.js.map
