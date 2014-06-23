/**
* @class core.ui.UiPluginManagerComponent
* @implements core.ui.UiComponentInterface
*/
var UiPluginManagerComponent = (function () {
    function UiPluginManagerComponent(pluginManager) {
        var _this = this;
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
            pluginManager.activatePluginState(function () {
                _this._setInitialState();
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
            _this._addPlugin(identifier);
        });
    };

    UiPluginManagerComponent.prototype._setInitialState = function () {
        var _this = this;
        this._pluginManager.getActivePluginRunners(function (runners) {
            var runnerIdentifiers = Object.keys(runners);
            var callbackCount = 0;
            var checkAndUpdate = function () {
                if (callbackCount === runnerIdentifiers.length) {
                    _this._updateUi();
                }
            };

            if (!runnerIdentifiers.length) {
                return;
            }

            for (var i = 0, l = runnerIdentifiers.length; i < l; i++) {
                var identifier = runnerIdentifiers[i];

                runners[identifier].getSearchFields(function (err, fields) {
                    _this._addSearchFields(identifier, err, fields);

                    callbackCount++;
                    checkAndUpdate();
                });
            }
        });
    };

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

            runner.getSearchFields(function (err, fields) {
                _this._addSearchFields(identifier, err, fields);
                //this._updateUi();
            });
        });
    };

    /**
    * Adds the givent fields to the specified identifier and logs an error to the console if present
    *
    * @member core.ui.UiPluginManagerComponent~_addSearchFields
    *
    * @param {string} identifier
    * @param {Error} err
    * @param {Object} fields
    */
    UiPluginManagerComponent.prototype._addSearchFields = function (identifier, err, fields) {
        if (err) {
            console.error(err);
        } else if (fields) {
            this._state[identifier] = fields;
        }
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

            for (var i = 0, l = this._connections.length; i < l; i++) {
                this._connections[i].send('update', state);
            }
        }
    };
    return UiPluginManagerComponent;
})();

module.exports = UiPluginManagerComponent;
//# sourceMappingURL=UiPluginManagerComponent.js.map
