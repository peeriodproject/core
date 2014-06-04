/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ObjectConfig = require('./ObjectConfig');

//import LoggerFactory = require('../utils/logger/LoggerFactory');
//var logger = LoggerFactory.create();
/**
* The class `JSONConfig` loads a JSON-file and converts it into a dot-notated key-value store.
*
* @see {@link core.config.ObjectConfig} for an example how to limit the store to specified namespaces.
*
* @class core.config.JSONConfig
* @extends core.config.ObjectConfig
*
* @throws Throws a `file not found` error if no file could be found at the specified `configPath`.
* @throws Throws a `syntax error` if the specified file contains invalid JSON.
*
* @param {string} configPath The path to the JSON file
* @param {core.config.ConfigKeyListInterface} configKeys An array of namespace keys to limit the store
*/
var JSONConfig = (function (_super) {
    __extends(JSONConfig, _super);
    function JSONConfig(configPath, configKeys) {
        if (typeof configKeys === "undefined") { configKeys = []; }
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

        _super.call(this, fileData, configKeys);
    }
    return JSONConfig;
})(ObjectConfig);

module.exports = JSONConfig;
//# sourceMappingURL=JSONConfig.js.map
