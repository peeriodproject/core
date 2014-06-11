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

    /*onMessage (message:any):void {
    }*/
    UiComponent.prototype.onConnection = function (spark) {
    };
    return UiComponent;
})();

module.exports = UiComponent;
//# sourceMappingURL=UiComponent.js.map
