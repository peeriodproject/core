/// <reference path='../../main.d.ts' />
var fs = require('fs-extra');

/**
* @class core.utils.JSONStateHandler
* @implements core.utils.StateHandlerInterface
*
* @param {string} path
*/
var JSONStateHandler = (function () {
    function JSONStateHandler(path) {
        /**
        * The absolute path to load the state from and save it later on.
        *
        * @member {string} core.utils.JSONStateLoader~_path
        */
        this._path = '';
        this._path = path;
    }
    JSONStateHandler.prototype.load = function (callback) {
        var _this = this;
        fs.readJson(this._path, function (err, data) {
            if (err) {
                if (err['code'] && err['code'] === 'ENOENT') {
                    err = new Error('JSONStateHandler.load: Cannot find state file: "' + _this._path + '"');
                } else if (err.constructor.call(undefined).toString() === 'SyntaxError') {
                    err = new Error('JSONStateHandler.load: The file "' + _this._path + '" is not a valid JSON-File.');
                }

                callback(err, null);
            } else {
                callback(null, data);
            }
        });
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
    return JSONStateHandler;
})();

module.exports = JSONStateHandler;
//# sourceMappingURL=JSONStateHandler.js.map
