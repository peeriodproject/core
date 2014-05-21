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
            timeout: 5000,
            useStrictMode: true,
            api: this._getPluginApiPath()
        });
        this._pluginGlobalsFactory = new PluginGlobalsFactory();
        this._pluginCode = fs.readFileSync(this._pluginScriptPath, 'utf-8');
        /*this._sandboxScript = this._sandbox.createScript(script);
        
        var foo = false;
        // todo begin independent methods
        var globals:Object = this._pluginGlobalsFactory.create(null, null) || {};
        
        this._sandboxScript.on('exit', (err, output, methodName) => {
        /*console.log('--- EXIT ---');
        if (err) {
        console.log(err.message);
        console.log(err.stack);
        }
        console.log('methodName', methodName);
        console.log(output);
        
        if (!foo) {
        this._sandboxScript.run('main.onTest', Object.freeze(globals));
        foo = true;
        }* /
        //this._sandboxScript.reset();
        });
        
        this._sandboxScript.on('timeout', function () {
        //console.log('--- TIMEOUT ---');
        //console.log('I timed out, oh what a silly script I am!');
        });
        
        this._sandboxScript.run('main.onInit', Object.freeze(globals));
        /*this._sandboxScript.run('onInit');
        this._sandboxScript.run('onInit', {
        foo: "bar"
        });* /
        */
    }
    PluginRunner.prototype.cleanup = function () {
        for (var key in this._sandboxScripts) {
            // todo ts-definitions
            //this._sandboxScripts.reset();
        }

        this._sandboxScripts = null;
        this._sandbox = null;
        this._pluginGlobalsFactory = null;
    };

    PluginRunner.prototype.onBeforeItemAdd = function (itemPath, stats, callback) {
        var script = this._createSandbox(itemPath);

        this._registerSandboxErrorAndTimeoutHandler(itemPath, callback);

        script.on('exit', function (err, output, methodName) {
            // todo check ob exit auch nach einem timeout getriggert wird
            if (err) {
                // todo handle error
                callback(err, null);
            } else {
                callback(null, output);
            }
        });

        script.run('main.onBeforeItemAdd', this._pluginGlobalsFactory.create(itemPath, stats));
    };

    /**
    * Creates a sandbox for the given item path. Each sandbox provides a persistent state
    * between lookups as long as the PluginRunner is active.
    *
    * @method core.plugin.PluginRunner~_createSandbox
    *
    * @param {string} itemPath
    * @returns {any}
    */
    PluginRunner.prototype._createSandbox = function (itemPath) {
        return this._sandboxScripts[itemPath] ? this._sandboxScripts[itemPath] : this._sandbox.createScript(this._pluginCode);
    };

    /**
    * Registers a error an timeout handler for the sandbox which belongs to the given path
    *
    * @method core.plugin.PluginRunner~_registerSandboxErrorAndTimeoutHandler
    *
    * @param {string} itemPath
    * @param {Function} callback
    */
    PluginRunner.prototype._registerSandboxErrorAndTimeoutHandler = function (itemPath, callback) {
        if (this._sandboxScripts[itemPath]) {
            this._sandboxScripts[itemPath].on('timeout', function () {
                // todo callback
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
