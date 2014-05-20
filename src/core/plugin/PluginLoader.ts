/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');
import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginConfigInterface = require('./interfaces/PluginConfigInterface');
import PluginLoaderInterface = require('./interfaces/PluginLoaderInterface');

/**
 * @class core.plugin.PluginLoader
 * @implements core.plugin.PluginLoaderInterface
 */
class PluginLoader implements PluginLoaderInterface {

	private _config:ConfigInterface = null;

	private _configData:PluginConfigInterface = null;

	private _pluginPath:string = '';

	private _configRequiredKeysMap:{ [key:string]:any } = {
		description        : String,
		identifier         : String,
		main               : String,
		name               : String,
		type               : String,
		version            : String
	};

	private _configOptionalKeysMap:{ [key:string]:any } = {
		fileTypes          : Array,
		fileTypes_item     : String,
		fileMimeTypes      : Array,
		fileMimeTypes_item : String,
		fileExtensions     : Array,
		fileExtensions_item: String,
		modules          : Array,
		modules_item     : String,
		dependencies     : Array,
		dependencies_item: String
	};

	constructor (config:ConfigInterface, pluginPath:string) {
		this._config = config;
		this._pluginPath = pluginPath;

		// todo send pull request to https://github.com/borisyankov/DefinitelyTyped to fix fs-extra.readJsonSync return type
		this._configData = <any>fs.readJsonSync(path.resolve(pluginPath, this._config.get('plugin.pluginConfigName')));

		var isValid:boolean = this._checkAndLoadFileTypes();

		if (!isValid) {
			throw new Error('PluginLoader.constructor: No file extensions or mime types specified.');
		}

		this._checkRequiredConfigFields();
		this._checkOptionalConfigFields();
	}

	getDependencies ():Array<string> {
		return this._configData.dependencies;
	}

	getDescription ():string {
		return this._configData.description;
	}

	getFileExtensions ():Array<string> {
		return this._configData[this._getPluginConfigKey('fileExtensions')];
	}

	getFileMimeTypes ():Array<string> {
		return this._configData[this._getPluginConfigKey('fileMimeTypes')];
	}

	getIdentifier ():string {
		return this._configData.identifier;
	}

	getMain ():string {
		return path.resolve(this._pluginPath, this._configData.main);
	}

	getModules ():Array<string> {
		return this._configData.modules;
	}

	getName ():string {
		return this._configData.name;
	}

	getType ():string {
		return this._configData.type;
	}

	getVersion ():string {
		return this._configData.version;
	}

	isPrivate ():boolean {
		return this._configData.private;
	}

	private _checkRequiredConfigFields ():void {
		for (var key in this._configRequiredKeysMap) {
			var pluginConfigKey:string = this._getPluginConfigKey(key);

			if (!this._configData[pluginConfigKey] === undefined) {
				throw new Error('PluginLoader~_checkrequiredConfigFields: The field "' + key + 'is required');
			}

			this._checkConfigType(this._configRequiredKeysMap, pluginConfigKey, key);
		}
	}

	private _checkOptionalConfigFields ():void {
		for (var key in this._configOptionalKeysMap) {
			var pluginConfigKey:string = this._getPluginConfigKey(key);

			this._checkConfigType(this._configOptionalKeysMap, pluginConfigKey, key);
		}
	}

	/**
	 * Returns the lowercased version of the key if it's used within the config file
	 *
	 * @param key
	 * @returns {string}
	 * @private
	 */
	private _getPluginConfigKey (key:string):string {
		if (this._configData[key] === undefined && this._configData[key.toLowerCase()] !== undefined) {
			key = key.toLowerCase();
		}

		return key;
	}

	private _checkConfigType (map, pluginConfigKey, key):void {
		var field:any = this._configData[pluginConfigKey];

		if (field && field.constructor !== map[key]) {
			throw new Error('PluginLoader~_checkConfigType: The config field "' + pluginConfigKey + '" has not the right type.');
		}
		// checking inner type
		else if (Array.isArray(field)) {
			if (field.length) {
				for (var i in field) {
					if (field[i] && field[i].constructor !== map[key + '_item']) {
						//var name:string = Object.prototype.toString.call(map[key + '_item']).slice(8, -1);
						var name:string = map[key + '_item'].name;
						throw new Error('PluginLoader~_checkConfigType: The config field "' + pluginConfigKey + '" contains an item wich should be a "' + name + '"');
					}
				}
			}
		}
	}

	private _checkAndLoadFileTypes ():boolean {
		var fileTypes:any = this._configData[this._getPluginConfigKey('fileTypes')];

		if (fileTypes && typeof fileTypes === 'string') {
			if (fileTypes.indexOf('.') === 0) {
				var data = <any>fs.readJsonSync(path.resolve(this._pluginPath, fileTypes));

				this._configData['fileExtensions'] = data.extensions || [];
				this._configData['fileMimeTypes'] = data.mimeTypes || data.mimetypes || [];

				// cleaning up the fileTypes path
				delete this._configData['fileTypes'];

				return true;
			}
			else {
				// todo parse fieldTypes Array
			}
		}
		else if (this.getFileMimeTypes().length || this.getFileExtensions().length) {
			return true;
		}

		return false;
	}
}

export = PluginLoader;