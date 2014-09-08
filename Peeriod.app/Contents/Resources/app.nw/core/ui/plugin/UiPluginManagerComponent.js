var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiPluginManagerComponent
* @implements core.ui.UiComponentInterface
*/
var UiPluginManagerComponent = (function (_super) {
    __extends(UiPluginManagerComponent, _super);
    function UiPluginManagerComponent(pluginManager) {
        var _this = this;
        _super.call(this);
        this._pluginManager = null;
        this._state = {};

        this._pluginManager = pluginManager;

        //this._setupEventListeners();
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

    UiPluginManagerComponent.prototype.getEventNames = function () {
        return [];
    };

    UiPluginManagerComponent.prototype.getState = function (callback) {
        return process.nextTick(callback.bind(null, this._state));
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
                    _this.updateUi();
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
                //this.updateUi();
            });
        });
    };

    /**
    * Adds the given fields to the specified identifier and logs an error to the console if present
    *
    * @member core.ui.UiPluginManagerComponent~_addSearchFields
    *
    * @param {string} identifier
    * @param {Error} err
    * @param {Object} fields
    */
    UiPluginManagerComponent.prototype._addSearchFields = function (identifier, err, fields) {
        if (err) {
            //console.error(err);
        } else if (fields) {
            this._state[identifier] = fields;
        }
    };
    return UiPluginManagerComponent;
})(UiComponent);

module.exports = UiPluginManagerComponent;
//# sourceMappingURL=UiPluginManagerComponent.js.map
