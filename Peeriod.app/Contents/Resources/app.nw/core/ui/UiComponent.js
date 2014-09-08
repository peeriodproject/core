/// <reference path='../../../ts-definitions/node/node.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

/**
* @class core.ui.UiComponent
* @implements core.ui.UiComponentInterface
*/
var UiComponent = (function (_super) {
    __extends(UiComponent, _super);
    function UiComponent() {
        _super.apply(this, arguments);
    }
    UiComponent.prototype.getChannelName = function () {
        return undefined;
    };

    UiComponent.prototype.getEventNames = function () {
        return [];
    };

    UiComponent.prototype.getState = function (callback) {
        return process.nextTick(callback.bind(null, {}));
    };

    UiComponent.prototype.onUiUpdate = function (listener) {
        this.addListener('updateUi', listener);
    };

    UiComponent.prototype.onAfterUiUpdate = function () {
    };

    UiComponent.prototype.updateUi = function () {
        this.emit('updateUi');
    };
    return UiComponent;
})(events.EventEmitter);

module.exports = UiComponent;
//# sourceMappingURL=UiComponent.js.map
