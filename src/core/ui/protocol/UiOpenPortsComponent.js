/// <reference path='../../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiOpenPortsComponent
* @extends core.ui.UiComponent
*/
var UiOpenPortsComponent = (function (_super) {
    __extends(UiOpenPortsComponent, _super);
    function UiOpenPortsComponent(openPortsStateHandler) {
        var _this = this;
        _super.call(this);
        /**
        * Keeps track of the initial open ports which are used to show a "restart app to activate new ports" message
        *
        * @member {Array} core.ui.UiOpenPortsComponent~_initialPorts
        */
        this._initialPorts = [];
        /**
        *
        * @member {Array} core.ui.UiOpenPortsComponent~_currentPorts
        */
        this._currentPorts = [];

        this._openPortsStateHandler = openPortsStateHandler;

        this._openPortsStateHandler.load(function (err, state) {
            _this._initialPorts = state && state.openPorts ? state.openPorts : [];
            _this._initialPorts.sort();

            _this._currentPorts = _this._initialPorts;
        });

        this._setupEventListeners();
    }
    UiOpenPortsComponent.prototype.getChannelName = function () {
        return 'openports';
    };

    UiOpenPortsComponent.prototype.getEventNames = function () {
        return ['addPort', 'removePort'];
    };

    UiOpenPortsComponent.prototype.getState = function (callback) {
        var portsChanged = JSON.stringify(this._currentPorts) !== JSON.stringify(this._initialPorts);

        return process.nextTick(callback.bind(null, {
            ports: this._currentPorts,
            portsChanged: portsChanged
        }));
    };

    UiOpenPortsComponent.prototype._setupEventListeners = function () {
        var _this = this;
        this.on('addPort', function (portToAdd) {
            if (isNaN(portToAdd)) {
                return;
            }

            if (_this._currentPorts.indexOf(portToAdd) === -1) {
                var portsToSave = _this._currentPorts.slice();
                portsToSave.push(portToAdd);

                _this._saveState(portsToSave);
            }
        });

        this.on('removePort', function (portToRemove) {
            var index = _this._currentPorts.indexOf(portToRemove);

            if (index === -1) {
                return;
            }
            var portsToSave = _this._currentPorts.slice();
            portsToSave.splice(index, 1);

            _this._saveState(portsToSave);
        });
    };

    UiOpenPortsComponent.prototype._saveState = function (portsToSave) {
        var _this = this;
        this._openPortsStateHandler.save({ openPorts: portsToSave }, function (err) {
            if (!err) {
                _this._currentPorts = portsToSave;

                _this._currentPorts.sort();
            }

            _this.updateUi();
        });
    };
    return UiOpenPortsComponent;
})(UiComponent);

module.exports = UiOpenPortsComponent;
//# sourceMappingURL=UiOpenPortsComponent.js.map
