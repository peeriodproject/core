/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');

import StateHandlerInterface = require('./interfaces/StateHandlerInterface');

/**
 * @class core.utils.JSONStateHandler
 * @implements core.utils.StateHandlerInterface
 *
 * @param {string} path The path of the file that the handler will use get and save the state
 * @param {string} [fallbackPath] An optional fallback path where the handler will load it's initial state from.
 */
class JSONStateHandler implements StateHandlerInterface {

	/**
	 * The absolute path to load the state from and save it later on.
	 *
	 * @member {string} core.utils.JSONStateLoader~_path
	 */
	private _path:string = '';

	/**
	 * The optional fallback path where the handler will load it's initial state from.
	 *
	 * @member {string} core.utils.JSONStateLoader~_fallbackPath
	 */
	private _fallbackPath:string = '';

	constructor (path:string, fallbackPath:string = '') {
		this._path = path;
		this._fallbackPath = fallbackPath;
	}

	public load (callback:(err:Error, state:Object) => any):void {
		var notFoundError:Error = new Error('JSONStateHandler#load: Cannot find state file: "' + this._path + '"');

		fs.exists(this._path, (exists:boolean) => {
			if (!exists && !this._fallbackPath) {
				return callback(notFoundError, null);
			}

			if (exists) {
				return this._loadState(callback);
			}
			else if (this._fallbackPath) {
				fs.copy(this._fallbackPath, this._path, (err:Error) => {
					if (err) {
						if (err['code'] && err['code'] === 'ENOENT') {
							err = notFoundError;
						}

						return callback(err, null);
					}

					return this._loadState(callback);
				});
			}
		});
	}

	public save (state:Object, callback:(err:Error) => void):void {
		var bootstrapFileAndSave = () => {
			fs.createFile(this._path, function (err:Error) {
				if (err) {
					return callback(err);
				}
				else {
					save();
				}
			});
		};

		var save = () => {
			fs.writeJson(this._path, state, function (err:Error) {
				callback(err);
			});
		};

		fs.exists(this._path, (exists:boolean) => {
			if (!exists) {
				bootstrapFileAndSave();
			}
			else {
				save();
			}
		});
	}

	private _loadState (callback:(err:Error, state:Object) => any):void {
		fs.readJson(this._path, (err:Error, data:Object) => {
			if (err) {
				if (err.constructor.call(undefined).toString() === 'SyntaxError') {
					err = new Error('JSONStateHandler~_loadState: The file "' + this._path + '" is not a valid JSON-File.');
				}

				return callback(err, null);
			}

			return callback(null, data);
		});
	}

}

export = JSONStateHandler;