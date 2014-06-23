/**
* @class core.ui.UiPluginManagerComponent
* @implements core.ui.UiComponentInterface
*/
var UiPluginManagerComponent = (function () {
    function UiPluginManagerComponent(pluginManager) {
        /**
        * todo ts-definition
        */
        this._connections = [];
        this._pluginManager = null;
        this._state = {};
        this._pluginManager = pluginManager;

        this._setupPluginManagerEvents();

        pluginManager.open(function (err) {
            /*pluginManager.findNewPlugins(function (err, data) {
            console.log(err, data);
            });*/
            console.log('opened!');
            pluginManager.activatePluginState(function () {
                console.log('plugin state activated!');
                //this._setInitialState();
            });
        });
    }
    UiPluginManagerComponent.prototype.getChannelName = function () {
        return 'plugin';
    };

    UiPluginManagerComponent.prototype.getState = function () {
        return this._state;
    };

    UiPluginManagerComponent.prototype.onConnection = function (spark) {
        this._connections.push(spark);
    };

    UiPluginManagerComponent.prototype._setupPluginManagerEvents = function () {
        var _this = this;
        this._pluginManager.addEventListener('pluginAdded', function (identifier) {
            console.log('plugin added!', identifier);
            _this._addPlugin(identifier);
        });
    };

    /*private _setInitialState ():void {
    console.log('_setInitialState');
    this._pluginManager.getActivePluginRunners((runners:PluginRunnerMapInterface) => {
    / *console.log('RUNNERS', runners);
    var runnerIdentifiers:Array<string> = Object.keys(runners);
    var callbackCount:number = 0;
    var checkAndUpdate:Function = () => {
    if (callbackCount === runnerIdentifiers.length) {
    this._updateUi();
    }
    };
    
    if (!runnerIdentifiers.length) {
    return;
    }
    
    for (var i = 0, l = runnerIdentifiers.length; i < l; i++) {
    var identifier:string = runnerIdentifiers[i];
    
    console.log('getting search fields', identifier);
    runners[identifier].getSearchFields((fields) => {
    console.log('got search fields', fields);
    this._state[identifier] = fields;
    
    callbackCount++;
    checkAndUpdate();
    });
    
    }* /
    });
    }*/
    /**
    * Adds the fields of the corresponding PluginRunner to the state
    *
    * @param {string} identifier The PluginRunner identifier
    */
    UiPluginManagerComponent.prototype._addPlugin = function (identifier) {
        var _this = this;
        this._pluginManager.getActivePluginRunner(identifier, function (runner) {
            if (!runner) {
                return;
            }

            console.log('--------------');
            console.log('get mapping fields');
            runner.getMapping(function (err, mapping) {
                console.log('MAPPING');
                console.log(mapping);
            });

            console.log('get search fields');
            runner.getSearchFields(function (err, fields) {
                console.log('got search fields');
                console.log(err);
                if (err) {
                    console.error(err);
                }
                console.log(fields);
                _this._state[identifier] = fields;
                //this._updateUi();
            });
            console.log('-------');
        });
    };

    /**
    * Sends the updates to all connected clients via `update` message.
    *
    * todo move this to the base class!
    *
    * @member core.ui.UiPluginManagerComponent~_updateUi
    */
    UiPluginManagerComponent.prototype._updateUi = function () {
        if (this._connections.length) {
            var state = this.getState();

            console.log(state);

            for (var i = 0, l = this._connections.length; i < l; i++) {
                this._connections[i].send('update', state);
            }
        }
    };
    return UiPluginManagerComponent;
})();

module.exports = UiPluginManagerComponent;
//# sourceMappingURL=UiPluginManagerComponent.js.map
