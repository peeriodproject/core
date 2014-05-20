/// <reference path='../../main.d.ts' />
var fs = require('fs-extra');
var path = require('path');

/**
* @class core.plugin.PluginLoader
* @implements core.plugin.PluginLoaderInterface
*/
var PluginLoader = (function () {
    function PluginLoader(config, pluginPath) {
        this._config = null;
        this._configData = null;
        this._pluginPath = '';
        this._configRequiredKeysMap = {
            description: String,
            identifier: String,
            main: String,
            name: String,
            type: String,
            version: String
        };
        this._configOptionalKeysMap = {
            fileTypes: Array,
            fileTypes_item: String,
            fileMimeTypes: Array,
            fileMimeTypes_item: String,
            fileExtensions: Array,
            fileExtensions_item: String,
            modules: Array,
            modules_item: String,
            dependencies: Array,
            dependencies_item: String
        };
        this._config = config;
        this._pluginPath = pluginPath;

        // todo send pull request to https://github.com/borisyankov/DefinitelyTyped to fix fs-extra.readJsonSync return type
        this._configData = fs.readJsonSync(path.resolve(pluginPath, this._config.get('plugin.pluginConfigName')));

        var isValid = this._checkAndLoadFileTypes();

        if (!isValid) {
            throw new Error('PluginLoader.constructor: No file extensions or mime types specified.');
        }

        this._checkRequiredConfigFields();
        this._checkOptionalConfigFields();
    }
    PluginLoader.prototype.getDependencies = function () {
        return this._configData.dependencies;
    };

    PluginLoader.prototype.getDescription = function () {
        return this._configData.description;
    };

    PluginLoader.prototype.getFileExtensions = function () {
        return this._configData[this._getPluginConfigKey('fileExtensions')];
    };

    PluginLoader.prototype.getFileMimeTypes = function () {
        return this._configData[this._getPluginConfigKey('fileMimeTypes')];
    };

    PluginLoader.prototype.getIdentifier = function () {
        return this._configData.identifier;
    };

    PluginLoader.prototype.getMain = function () {
        return this._configData.main;
    };

    PluginLoader.prototype.getModules = function () {
        return this._configData.modules;
    };

    PluginLoader.prototype.getName = function () {
        return this._configData.name;
    };

    PluginLoader.prototype.getType = function () {
        return this._configData.type;
    };

    PluginLoader.prototype.getVersion = function () {
        return this._configData.version;
    };

    PluginLoader.prototype.isPrivate = function () {
        return this._configData.private;
    };

    PluginLoader.prototype._checkRequiredConfigFields = function () {
        for (var key in this._configRequiredKeysMap) {
            var pluginConfigKey = this._getPluginConfigKey(key);

            if (!this._configData[pluginConfigKey] === undefined) {
                throw new Error('PluginLoader~_checkrequiredConfigFields: The field "' + key + 'is required');
            }

            this._checkConfigType(this._configRequiredKeysMap, pluginConfigKey, key);
        }
    };

    PluginLoader.prototype._checkOptionalConfigFields = function () {
        for (var key in this._configOptionalKeysMap) {
            var pluginConfigKey = this._getPluginConfigKey(key);

            this._checkConfigType(this._configOptionalKeysMap, pluginConfigKey, key);
        }
    };

    /**
    * Returns the lowercased version of the key if it's used within the config file
    *
    * @param key
    * @returns {string}
    * @private
    */
    PluginLoader.prototype._getPluginConfigKey = function (key) {
        if (this._configData[key] === undefined && this._configData[key.toLowerCase()] !== undefined) {
            key = key.toLowerCase();
        }

        return key;
    };

    PluginLoader.prototype._checkConfigType = function (map, pluginConfigKey, key) {
        var field = this._configData[pluginConfigKey];

        if (field && field.constructor !== map[key]) {
            throw new Error('PluginLoader~_checkConfigType: The config field "' + pluginConfigKey + '" has not the right type.');
        } else if (Array.isArray(field)) {
            if (field.length) {
                for (var i in field) {
                    if (field[i] && field[i].constructor !== map[key + '_item']) {
                        //var name:string = Object.prototype.toString.call(map[key + '_item']).slice(8, -1);
                        var name = map[key + '_item'].name;
                        throw new Error('PluginLoader~_checkConfigType: The config field "' + pluginConfigKey + '" contains an item wich should be a "' + name + '"');
                    }
                }
            }
        }
    };

    PluginLoader.prototype._checkAndLoadFileTypes = function () {
        var fileTypes = this._configData[this._getPluginConfigKey('fileTypes')];

        if (fileTypes && typeof fileTypes === 'string') {
            if (fileTypes.indexOf('.') === 0) {
                var data = fs.readJsonSync(path.resolve(this._pluginPath, fileTypes));

                this._configData['fileExtensions'] = data.extensions || [];
                this._configData['fileMimeTypes'] = data.mimeTypes || data.mimetypes || [];

                // cleaning up the fileTypes path
                delete this._configData['fileTypes'];

                return true;
            } else {
                // todo parse fieldTypes Array
            }
        } else if (this.getFileMimeTypes().length || this.getFileExtensions().length) {
            return true;
        }

        return false;
    };
    return PluginLoader;
})();

module.exports = PluginLoader;
//# sourceMappingURL=PluginLoader.js.map
