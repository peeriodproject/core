var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ObjectConfig = require('./ObjectConfig');


/**
* The class `JSONConfig` loads a JSON-file and converts it into a dot.notated key-value store.
*
* @class core.config.JSONConfig
* @extends core.config.ObjectConfig
*
* todo add throw comment
* todo implement json loading without require
*
*
* @param {string} configPath
* @param {core.config.ConfigKeyListInterface} keys
*/
var JSONConfig = (function (_super) {
    __extends(JSONConfig, _super);
    function JSONConfig(configPath, keys) {
        if (typeof keys === "undefined") { keys = []; }
        var fileData = {};

        try  {
            if (configPath.indexOf('.json') === -1) {
                fileData = require(configPath + '.json');
            } else {
                fileData = require(configPath);
            }
        } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                throw new Error('JSONConfig.constructor: Cannot find config file: "' + configPath + '"');
            } else if (err.constructor.call().toString() === 'SyntaxError') {
                throw new Error('JSONConfig.constructor: The file "' + configPath + '" is not a valid JSON-File.');
            } else {
                throw err;
            }
        }

        _super.call(this, fileData, keys);
    }
    return JSONConfig;
})(ObjectConfig);

module.exports = JSONConfig;
//# sourceMappingURL=JSONConfig.js.map
