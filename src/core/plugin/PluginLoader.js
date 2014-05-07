/// <reference path='../../main.d.ts' />
var fs = require('fs-extra');
var path = require('path');

/**
* @class core.plugin.PluginLoader
* @implements core.plugin.PluginLoaderInterface
*
* @param {core.config.ConfigInterface} config
*/
var PluginLoader = (function () {
    function PluginLoader(config) {
        /**
        * @member {core.config.ConfigInterface} core.plugin.PluginLoader~_config
        */
        this._config = null;
        /**
        * A list of plugin folder names that are inored within the find process
        *
        * @member {core.config.ConfigInterface} core.plugin.PluginLoader~_ignoreFolderList
        */
        this._ignorePluginFolderNameList = [];
        /**
        * The name of a plugin config file
        *
        * @member {string} core.plugin.PluginLoader~_pluginConfigName
        */
        this._pluginConfigName = '';
        /**
        * The path to the applications plugin folder
        *
        * @member {string} core.plugin.PluginLoader~_pluginFolderPath
        */
        this._pluginFolderPath = '';
        this._config = config;

        this._pluginConfigName = this._config.get('plugin.pluginConfigName');
        this._pluginFolderPath = this._config.get('plugin.folderPath');
    }
    PluginLoader.prototype.addPluginFolderNamesToIgnoreList = function (pluginFolderNames, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };
        var pluginFolderNamesLength = pluginFolderNames ? pluginFolderNames.length : 0;
        var add = function (i) {
            var pluginFolderName = pluginFolderNames[i];

            _this._ignoreListContains(pluginFolderName, function (index) {
                if (index === -1) {
                    _this._ignorePluginFolderNameList.push(pluginFolderName);
                }

                if (i < pluginFolderNamesLength - 1) {
                    add(++i);
                } else {
                    internalCallback();
                }
            });
        };

        if (pluginFolderNamesLength) {
            add(0);
        } else {
            internalCallback();
        }
    };

    PluginLoader.prototype.findPlugins = function (callback) {
        var _this = this;
        var pluginPaths = {};
        var filesLeft = 0;

        // calls the internalCallback if all files are processed
        var checkAndCallCallback = function () {
            if (!filesLeft) {
                callback(null, pluginPaths);
            }
        };

        // checks if the given path contains a plugin config and adds it to the list
        var checkPath = function (filePath) {
            _this._ignoreListContains(filePath, function (index) {
                // current filePath is ignored. skipping...
                if (index !== -1) {
                    filesLeft--;
                    checkAndCallCallback();
                } else {
                    var pluginPath = path.join(_this._pluginFolderPath, filePath);
                    var pluginConfigPath = path.join(pluginPath, _this._pluginConfigName);

                    fs.stat(pluginPath, function (err, stat) {
                        if (!err) {
                            // it seems like we found a plugin folder, add the path to the list
                            if (stat.isDirectory() && fs.existsSync(pluginConfigPath)) {
                                pluginPaths[filePath] = pluginPath;
                            }
                        }

                        filesLeft--;
                        checkAndCallCallback();
                    });
                }
            });
        };

        this.getPluginFolderPath(function (err, folderPath) {
            if (err) {
                callback(err, null);
                return;
            } else {
                fs.readdir(_this._pluginFolderPath, function (err, files) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if (files && files.length) {
                            // promise how many paths should be processed
                            filesLeft = files.length;

                            files.forEach(function (file) {
                                checkPath(file);
                            });
                        } else {
                            // nothing to do here! returning...
                            callback(null, null);
                        }
                    }
                });
            }
        });
    };

    PluginLoader.prototype.getIgnoredPluginFolderNames = function (callback) {
        callback(this._ignorePluginFolderNameList.slice());
    };

    PluginLoader.prototype.getPluginFolderPath = function (callback) {
        var folderPath = this._pluginFolderPath;

        try  {
            fs.exists(folderPath, function (exists) {
                if (exists) {
                    callback(null, folderPath);
                } else {
                    fs.mkdirs(folderPath, function (err) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, folderPath);
                        }
                    });
                }
            });
        } catch (err) {
            callback(err, null);
        }
    };

    PluginLoader.prototype.removePluginFolderNamesFromIgnoreList = function (pluginFolderNames, callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };
        var pluginFolderNamesLength = pluginFolderNames ? pluginFolderNames.length : 0;
        var remove = function (i) {
            var pluginFolderName = pluginFolderNames[i];

            _this._ignoreListContains(pluginFolderName, function (index) {
                if (index !== -1) {
                    _this._ignorePluginFolderNameList.splice(index, 1);

                    if (i < pluginFolderNamesLength - 1) {
                        remove(++i);
                    } else {
                        internalCallback();
                    }
                }
            });
        };

        if (pluginFolderNamesLength) {
            remove(0);
        } else {
            internalCallback();
        }
    };

    /**
    * Returns `true` if the {@link core.plugin.PluginLoader~_ignoreFolderList} contains the specified plugin name
    *
    * @see http://stackoverflow.com/a/11287978
    *
    * @param {string} pluginName
    * @param {Function} callback
    */
    PluginLoader.prototype._ignoreListContains = function (pluginName, callback) {
        var list = this._ignorePluginFolderNameList;

        return (function check(i) {
            if (i >= list.length) {
                return callback(-1);
            }

            if (list[i] === pluginName) {
                return callback(i);
            }

            return process.nextTick(check.bind(null, i + 1));
        }(0));
    };
    return PluginLoader;
})();

module.exports = PluginLoader;
//# sourceMappingURL=PluginLoader.js.map
