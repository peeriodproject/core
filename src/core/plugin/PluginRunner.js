/// <reference path='../../main.d.ts' />
var fs = require('fs');
var path = require('path');

var SandCastle = require('sandcastle').SandCastle;

var PluginGlobalsFactory = require('./PluginGlobalsFactory');

/**
* @see https://github.com/KyleJune/udibo-sandbox
*
* @class core.plugin.PluginRunner
* @implements core.plugin.PluginRunnerInterface
*
* @params {core.config.ConfigInterface} config
* @params {string} identifier todo remove identifer
* @params {plugnScriptPath}
*/
var PluginRunner = (function () {
    // todo plugin-type PluginGlobalsFactory factory parameter
    function PluginRunner(config, identifier, pluginScriptPath) {
        this._config = null;
        this._sandbox = null;
        this._sandboxScripts = [];
        this._pluginCode = null;
        this._pluginGlobalsFactory = null;
        this._pluginScriptPath = null;
        this._config = config;
        this._pluginScriptPath = pluginScriptPath;

        this._sandbox = new SandCastle({
            memoryLimitMB: 100,
            timeout: 2000,
            useStrictMode: true,
            api: this._getPluginApiPath()
        });
        this._pluginGlobalsFactory = new PluginGlobalsFactory();
        this._pluginCode = fs.readFileSync(this._pluginScriptPath, 'utf-8');
    }
    PluginRunner.prototype.cleanup = function () {
        for (var key in this._sandboxScripts) {
            this._sandboxScripts[key].reset();
        }

        this._sandboxScripts = null;
        this._sandbox = null;
        this._pluginGlobalsFactory = null;
    };

    PluginRunner.prototype.onBeforeItemAdd = function (itemPath, stats, callback) {
        this._createAndRunSandbox(itemPath, stats, 'main.onBeforeItemAdd', callback, function (err, output, methodName) {
            if (err) {
                console.log(err.message);
                console.log(err['stack']);

                // todo handle error
                callback(err, null);
            } else {
                callback(null, output);
            }
        });
    };

    /**
    * Creates a sandbox, registers a timeout handler, addes the onExit callback and runs the specified method name.
    *
    * @method core.plugin.PluginRunner~_createAndRunSandbox
    *
    * @param {string} itemPath
    * @param {fs.Stats} stats
    * @param {string} methodName
    * @param {Function} callback
    * @param {Function} onExit
    */
    PluginRunner.prototype._createAndRunSandbox = function (itemPath, stats, methodName, callback, onExit) {
        this._createSandbox(itemPath);
        this._registerSandboxTimeoutHandler(itemPath, callback);
        this._sandboxScripts[itemPath].on('exit', onExit);
        this._sandboxScripts[itemPath].run(methodName, this._pluginGlobalsFactory.create(itemPath, stats));
    };

    /**
    * Creates a sandbox for the given item path. Each sandbox provides a persistent state
    * between lookups as long as the PluginRunner is active.
    *
    * @method core.plugin.PluginRunner~_createSandbox
    *
    * @param {string} itemPath
    *
    * @returns {any}
    */
    PluginRunner.prototype._createSandbox = function (itemPath) {
        if (!this._sandboxScripts[itemPath]) {
            this._sandboxScripts[itemPath] = this._sandbox.createScript(this._pluginCode);
        }
    };

    /**
    * Registers a timeout handler for the sandbox which belongs to the given path
    *
    * @method core.plugin.PluginRunner~_registerSandboxTimeoutHandler
    *
    * @param {string} itemPath
    * @param {Function} callback
    */
    PluginRunner.prototype._registerSandboxTimeoutHandler = function (itemPath, callback) {
        if (this._sandboxScripts[itemPath]) {
            this._sandboxScripts[itemPath].on('timeout', function (methodName) {
                callback(new Error('PluginRunner~registerSandboxTimeouthandler: The Plugin did not respond to a call "' + methodName), null);
            });
        }
    };

    /**
    * Returns an absolute path to the PluginApi file
    *
    * @method core.plugin.PluginRunner~_getPluginApiPath
    *
    * @returns {string}
    */
    PluginRunner.prototype._getPluginApiPath = function () {
        return path.resolve(this._config.get('plugin.api.basePath'), this._config.get('plugin.api.pluginApiName'));
    };
    return PluginRunner;
})();

module.exports = PluginRunner;
//# sourceMappingURL=PluginRunner.js.map
