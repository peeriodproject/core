/// <reference path='../../main.d.ts' />

import fs = require('fs-extra');

import StateHandlerInterface = require('./interfaces/StateHandlerInterface');

/**
 * @class core.utils.JSONStateHandler
 * @implements core.utils.StateHandlerInterface
 *
 * @param {string} path
 */
class JSONStateHandler implements StateHandlerInterface {

	/**
	 * The absolute path to load the state from and save it later on.
	 *
	 * @member {string} core.utils.JSONStateLoader~_path
	 */
	private _path:string = '';

	constructor (path:string) {
		this._path = path;
	}

	public load (callback:(err:Error, state:Object) => void):void {
		fs.readJson(this._path, (err:Error, data:Object) => {
			if (err) {
				if (err['code'] && err['code'] === 'ENOENT') {
					err = new Error('JSONStateHandler.load: Cannot find state file: "' + this._path + '"');
				}
				else if (err.constructor.call(undefined).toString() === 'SyntaxError') {
					err = new Error('JSONStateHandler.load: The file "' + this._path + '" is not a valid JSON-File.');
				}

				callback(err, null);
			}
			else {
				callback(null, data);
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

}

export = JSONStateHandler;