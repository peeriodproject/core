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
*/
var PluginRunner = (function () {
    // todo plugin-type PluginGlobalsFactory factory parameter
    function PluginRunner(config, identifier, pluginScriptPath) {
        this._config = null;
        this._sandbox = null;
        this._sandboxScript = null;
        this._config = config;
        this._sandbox = new SandCastle({
            memoryLimitMB: 100,
            timeout: 5000,
            useStrictMode: true,
            api: this._getPluginApiPath()
        });

        var script = fs.readFileSync(pluginScriptPath, 'utf-8');

        this._sandboxScript = this._sandbox.createScript(script);

        var foo = false;

        // todo begin independen method
        var globals = new PluginGlobalsFactory().create() || {};

        this._sandboxScript.on('exit', function (err, output, methodName) {
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
            }*/
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
        });*/
    }
    PluginRunner.prototype._getPluginApiPath = function () {
        return path.resolve(this._config.get('plugin.api.basePath'), this._config.get('plugin.api.pluginApiName'));
    };
    return PluginRunner;
})();

module.exports = PluginRunner;
//# sourceMappingURL=PluginRunner.js.map
