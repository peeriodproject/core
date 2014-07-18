/// <reference path='../../main.d.ts' />
var fs = require('fs');
var path = require('path');

var SandCastle = require('sandcastle').SandCastle;

var PluginGlobalsFactory = require('./PluginGlobalsFactory');

/**
* @class core.plugin.PluginRunner
* @implements core.plugin.PluginRunnerInterface
*
* @params {core.config.ConfigInterface} config
* @params {string} identifier todo remove identifer
* @params {string} pluginScriptPath
*/
var PluginRunner = (function () {
    // todo plugin-type PluginGlobalsFactory factory parameter
    function PluginRunner(config, identifier, pluginScriptPath) {
        this._config = null;
        this._sandbox = null;
        this._sandboxScripts = {};
        this._sandboxSocketPath = '';
        this._pluginCode = null;
        this._pluginGlobalsFactory = null;
        this._pluginScriptPath = null;
        this._config = config;
        this._pluginScriptPath = pluginScriptPath;

        // todo wait for node webkits child_process.spawn fix and remove own binary
        // we're using our own node binary as a temporary fix here!
        // @see https://github.com/rogerwang/node-webkit/issues/213
        var nodeBinaryPath = path.join(__dirname, '../../bin/', this._config.get('plugin.binaryPath'));

        this._sandboxSocketPath = '/tmp/jjpluginrunner_' + Math.round(Math.random() * 1000).toString() + '.sock';

        this._sandbox = new SandCastle({
            memoryLimitMB: 1024,
            timeout: this._config.get('plugin.timeoutInSeconds') * 1000,
            useStrictMode: true,
            api: this._getPluginApiPath(),
            spawnExecPath: nodeBinaryPath,
            socket: this._sandboxSocketPath
        });

        this._pluginGlobalsFactory = new PluginGlobalsFactory();
        this._pluginCode = fs.readFileSync(this._pluginScriptPath, 'utf-8');
    }
    // todo add a interval that cleans up old item sandboxes
    PluginRunner.prototype.cleanup = function () {
        this._sandbox.kill();
        this._sandboxScripts = null;
        this._sandbox = null;
        this._pluginGlobalsFactory = null;

        try  {
            fs.unlinkSync(this._sandboxSocketPath);
        } catch (e) {
        }
    };

    PluginRunner.prototype.getMapping = function (callback) {
        this._createAndRunStaticSandbox('main.getMapping', {}, callback, function (output) {
            return callback(null, output);
        });
    };

    PluginRunner.prototype.getQuery = function (query, callback) {
        this._createAndRunStaticSandbox('main.getQuery', { query: query }, callback, function (output) {
            return callback(null, output);
        });
    };

    PluginRunner.prototype.getResultFields = function (callback) {
        this._createAndRunStaticSandbox('main.getResultFields', {}, callback, function (output) {
            return callback(null, output);
        });
    };

    PluginRunner.prototype.getSearchFields = function (callback) {
        this._createAndRunStaticSandbox('main.getSearchFields', {}, callback, function (output) {
            return callback(null, output);
        });
    };

    PluginRunner.prototype.onBeforeItemAdd = function (itemPath, stats, globals, callback) {
        this._createAndRunItemSandbox(itemPath, stats, globals, 'main.onBeforeItemAdd', callback, function (output) {
            return callback(null, output);
        });
    };

    /**
    * Creates a sandbox for a specified itemPath, registers a timeout handler, adds the onExit callback and runs the specified method name.
    *
    * @method core.plugin.PluginRunner~_createAndRunItemSandbox
    *
    * @param {string} itemPath
    * @param {fs.Stats} stats
    * @param {Object} globals
    * @param {string} methodName
    * @param {Function} callback
    * @param {Function} onExit
    */
    PluginRunner.prototype._createAndRunItemSandbox = function (itemPath, stats, globals, methodName, callback, onExit) {
        var sandboxKey = itemPath + '_' + methodName;

        this._createSandbox(sandboxKey);
        this._registerSandboxTimeoutHandler(sandboxKey, callback);
        this._registerSandboxExitHandler(sandboxKey, callback, onExit);

        this._sandboxScripts[sandboxKey].run(methodName, this._pluginGlobalsFactory.create(itemPath, stats, globals));
    };

    /**
    * Creates a static sandbox for the specified methodName, registers a timeout handler, adds the onExit callback and runs the specified method name.
    *
    * @method core.plugin.PluginRunner~_createAndRunStaticSandbox
    *
    * @param {string} methodName
    * @param {Object} globals
    * @param {Function} callback
    * @param {Function} onExit
    */
    PluginRunner.prototype._createAndRunStaticSandbox = function (methodName, globals, callback, onExit) {
        this._createSandbox(methodName);
        this._registerSandboxTimeoutHandler(methodName, callback);
        this._registerSandboxExitHandler(methodName, callback, onExit);

        this._sandboxScripts[methodName].run(methodName, globals);
    };

    /**
    * Creates a sandbox for the given item path. Each sandbox provides a persistent state storage
    * between lookups as long as the PluginRunner is active.
    *
    * @see core.plugin.PluginApi
    *
    * @method core.plugin.PluginRunner~_createSandbox
    *
    * @param {string} itemPath
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
        var _this = this;
        if (this._sandboxScripts[itemPath]) {
            this._sandboxScripts[itemPath].once('timeout', function (methodName) {
                _this._sandboxScripts[itemPath].reset();
                return callback(new Error('PluginRunner~registerSandboxTimeouthandler: The Plugin did not respond to a call "' + methodName), null);
            });
        }
    };

    /**
    * Binds a `exit` handler to the event. It calls the specified callback on error, or the onExit method after the sandbox finished it's run.
    *
    * @method core.plugin.PluginRunner~_registerSandboxExitHandler
    *
    * @param {string} identifier
    * @param {Function} callback
    * @param {Function} onExit
    */
    PluginRunner.prototype._registerSandboxExitHandler = function (identifier, callback, onExit) {
        var _this = this;
        if (this._sandboxScripts[identifier]) {
            this._sandboxScripts[identifier].once('exit', function (err, output, methodName) {
                _this._sandboxScripts[identifier].reset();

                if (err) {
                    return callback(err, null, methodName);
                }

                return onExit(output);
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
