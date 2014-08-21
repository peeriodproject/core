/// <reference path='../../main.d.ts' />
var fs = require('fs-extra');

/**
* @class core.utils.JSONStateHandler
* @implements core.utils.StateHandlerInterface
*
* @param {string} path The path of the file that the handler will use get and save the state
* @param {string} [fallbackPath] An optional fallback path where the handler will load it's initial state from.
*/
var JSONStateHandler = (function () {
    function JSONStateHandler(path, fallbackPath) {
        if (typeof fallbackPath === "undefined") { fallbackPath = ''; }
        /**
        * The absolute path to load the state from and save it later on.
        *
        * @member {string} core.utils.JSONStateLoader~_path
        */
        this._path = '';
        /**
        * The optional fallback path where the handler will load it's initial state from.
        *
        * @member {string} core.utils.JSONStateLoader~_fallbackPath
        */
        this._fallbackPath = '';
        this._path = path;
        this._fallbackPath = fallbackPath;
    }
    JSONStateHandler.prototype.load = function (callback) {
        var notFoundError = new Error('JSONStateHandler#load: Cannot find state file: "' + this._path + '"');

        var exists = fs.existsSync(this._path);
        if (!exists && !this._fallbackPath) {
            return callback(notFoundError, null);
        }

        if (exists) {
            return this._loadState(callback);
        } else if (this._fallbackPath) {
            try  {
                fs.copySync(this._fallbackPath, this._path);
            } catch (err) {
                if (err) {
                    if (err['code'] && err['code'] === 'ENOENT') {
                        err = notFoundError;
                    }

                    return callback(err, null);
                }
            }
            ;

            return this._loadState(callback);
        }
    };

    JSONStateHandler.prototype.save = function (state, callback) {
        var _this = this;
        var bootstrapFileAndSave = function () {
            fs.createFile(_this._path, function (err) {
                if (err) {
                    return callback(err);
                } else {
                    save();
                }
            });
        };

        var save = function () {
            fs.writeJson(_this._path, state, function (err) {
                callback(err);
            });
        };

        fs.exists(this._path, function (exists) {
            if (!exists) {
                bootstrapFileAndSave();
            } else {
                save();
            }
        });
    };

    JSONStateHandler.prototype._loadState = function (callback) {
        var _this = this;
        fs.readJson(this._path, function (err, data) {
            if (err) {
                if (err.constructor.call(undefined).toString() === 'SyntaxError') {
                    err = new Error('JSONStateHandler~_loadState: The file "' + _this._path + '" is not a valid JSON-File.');
                }

                return callback(err, null);
            }

            return callback(null, data);
        });
    };
    return JSONStateHandler;
})();

module.exports = JSONStateHandler;
//# sourceMappingURL=JSONStateHandler.js.map
