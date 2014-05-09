/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');
import path = require('path');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginCallbackInterface = require('./interfaces/PluginCallbackInterface');
import PluginFinderInterface = require('./interfaces/PluginFinderInterface');
import PluginMapInterface = require('./interfaces/PluginMapInterface');
import PluginNameListInterface = require('./interfaces/PluginNameListInterface');
import PluginPathListInterface = require('./interfaces/PluginPathListInterface');

import Logger = require('../utils/logger/Logger');

/**
 * @class core.plugin.PluginFinder
 * @implements core.plugin.PluginFinderInterface
 *
 * @param {core.config.ConfigInterface} config
 */
class PluginFinder implements PluginFinderInterface {

	/**
	 * The internally used config instance
	 *
	 * @member {core.config.ConfigInterface} core.plugin.PluginFinder~_config
	 */
	private _config:ConfigInterface = null;

	/**
	 * A list of plugin folder names that are inored within the find process
	 *
	 * @member {core.config.ConfigInterface} core.plugin.PluginFinder~_ignoreFolderList
	 */
	private _ignorePluginFolderNameList:PluginNameListInterface = [];

	/**
	 * The name of a plugin config file
	 *
	 * @member {string} core.plugin.PluginFinder~_pluginConfigName
	 */
	private _pluginConfigName:string = '';

	/**
	 * The path to the applications plugin folder
	 *
	 * @member {string} core.plugin.PluginFinder~_pluginFolderPath
	 */
	private _pluginFolderPath:string = '';

	constructor (config:ConfigInterface) {
		this._config = config;

		this._pluginConfigName = this._config.get('plugin.pluginConfigName');
		this._pluginFolderPath = this._config.get('plugin.folderPath');

		Logger.winston.lo
	}

	public addPluginFolderNamesToIgnoreList (pluginFolderNames:PluginNameListInterface, callback?:Function):void {
		var internalCallback = callback || function () {};
		var pluginFolderNamesLength:number = pluginFolderNames ? pluginFolderNames.length : 0;
		var add = (i:number):void => {
			var pluginFolderName:string = pluginFolderNames[i];

			this._ignoreListContains(pluginFolderName, (index:number) => {
				if (index === -1) {
					this._ignorePluginFolderNameList.push(pluginFolderName);
				}

				if (i < pluginFolderNamesLength - 1) {
					add(++i);
				}
				else {
					internalCallback();
				}
			});
		};

		if (pluginFolderNamesLength) {
			add(0);
		}
		else {
			internalCallback();
		}
	}

	public findPlugins (callback:(err:Error, pluginPaths:PluginPathListInterface) => void):void {
		var pluginPaths:PluginPathListInterface = {};
		var filesLeft:number = 0;

		// calls the internalCallback if all files are processed
		var checkAndCallCallback:Function = function () {
			if (!filesLeft) {
				callback(null, pluginPaths);
			}
		};
		// checks if the given path contains a plugin config and adds it to the list
		var checkPath = (filePath:string) => {
			this._ignoreListContains(filePath, (index:number) => {

				// current filePath is ignored. skipping...
				if (index !== -1) {
					filesLeft--;
					checkAndCallCallback();
				}
				else {
					var pluginPath:string = path.join(this._pluginFolderPath, filePath);
					var pluginConfigPath:string = path.join(pluginPath, this._pluginConfigName);

					fs.stat(pluginPath, function (err:Error, stat:fs.Stats) {
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

		this.getPluginFolderPath((err:Error, folderPath:string) => {
			if (err) {
				callback(err, null);
				return;
			}
			else {
				fs.readdir(this._pluginFolderPath, function (err:Error, files:PluginNameListInterface) {
					if (err) {
						callback(err, null);
					}
					else {
						if (files && files.length) {
							// promise how many paths should be processed
							filesLeft = files.length;

							files.forEach(function (file:string) {
								checkPath(file);
							});
						}
						else {
							// nothing to do here! returning...
							callback(null, null);
						}
					}
				});
			}
		});
	}

	public getIgnoredPluginFolderNames (callback:(names:PluginNameListInterface) => void):void {
		callback(this._ignorePluginFolderNameList.slice());
	}

	public getPluginFolderPath (callback:(err:Error, path:string) => void):void {
		var folderPath:string = this._pluginFolderPath;

		try {
			fs.exists(folderPath, function (exists:boolean) {
				if (exists) {
					callback(null, folderPath);
				}
				else {
					fs.mkdirs(folderPath, function (err:Error) {
						if (err) {
							callback(err, null);
						}
						else {
							callback(null, folderPath);
						}
					});
				}
			});
		}
		catch (err) {
			callback(err, null);
		}
	}

	public removePluginFolderNamesFromIgnoreList (pluginFolderNames:PluginNameListInterface, callback?:Function):void {
		var internalCallback = callback || function () {};
		var pluginFolderNamesLength:number = pluginFolderNames ? pluginFolderNames.length : 0
		var remove = (i:number):void => {
			var pluginFolderName:string = pluginFolderNames[i];

			this._ignoreListContains(pluginFolderName, (index:number) => {
				if (index !== -1) {
					this._ignorePluginFolderNameList.splice(index, 1);

					if (i < pluginFolderNamesLength - 1) {
						remove(++i);
					}
					else {
						internalCallback();
					}
				}
			});
		};

		if (pluginFolderNamesLength) {
			remove(0);
		}
		else {
			internalCallback();
		}
	}

	/**
	 * Returns `true` if the {@link core.plugin.PluginLoader~_ignoreFolderList} contains the specified plugin name
	 *
	 * @see http://stackoverflow.com/a/11287978
	 *
	 * @param {string} pluginName
	 * @param {Function} callback
	 */
	private _ignoreListContains (pluginName:string, callback:(index:number) => void):void {
		var list = this._ignorePluginFolderNameList;

		return (function check (i) {
			if (i >= list.length) {
				return callback(-1);
			}

			if (list[i] === pluginName) {
				return callback(i);
			}

			return process.nextTick(check.bind(null, i + 1));
		}(0));
	}

}

export = PluginFinder;