/// <reference path='../../../ts-definitions/node/node.d.ts' />
/**
* @class core.ui.UiComponent
* @implements core.ui.UiComponentInterface
*/
var UiComponent = (function () {
    function UiComponent() {
    }
    UiComponent.prototype.getChannelName = function () {
        return undefined;
    };

    UiComponent.prototype.getState = function () {
        return {};
    };

    /*onMessage (message:any):void {
    }*/
    UiComponent.prototype.onConnection = function (spark) {
    };
    return UiComponent;
})();

module.exports = UiComponent;
//# sourceMappingURL=UiComponent.js.map
