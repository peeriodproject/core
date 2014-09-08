/// <reference path='../../../ts-definitions/node-webkit/node-webkit.d.ts' />
/**
* @class core.utils.AppQuitHandler
* @implements core.utils.AppQuitHandlerInterface
*
* @param {nw.gui.App} app
*/
var AppQuitHandler = (function () {
    function AppQuitHandler(app) {
        /**
        * The node-webkit App instance which should be closed.
        *
        * @member {nw.gui.App} core.utils.AppQuitHandler~_app
        */
        this._app = null;
        /**
        * A list of functions that will be called before the app closes
        *
        * @member {Array<Function>} core.utils.AppQuitHandler~_callbacks
        */
        this._callbacks = [];
        /**
        * A simple counter that increments whenever a callback calls the done method.
        *
        * @member {number} core.utils.AppQuitHandler~_callbacksDoneCounter
        */
        this._callbacksDoneCounter = 0;
        this._app = app;
    }
    AppQuitHandler.prototype.add = function (callback) {
        if (this._callbacks.indexOf(callback) === -1) {
            this._callbacks.push(callback);
        }
    };

    AppQuitHandler.prototype.quit = function () {
        var _this = this;
        if (!this._callbacks.length) {
            return this._checkAndQuit();
        }

        for (var i = 0, l = this._callbacks.length; i < l; i++) {
            this._callbacks[i](function () {
                _this._callbackDone();
            });
        }
    };

    AppQuitHandler.prototype.remove = function (callback) {
        var index = this._callbacks.indexOf(callback);

        if (index !== -1) {
            this._callbacks.splice(index, 1);
        }
    };

    AppQuitHandler.prototype._callbackDone = function () {
        this._callbacksDoneCounter++;

        this._checkAndQuit();
    };

    AppQuitHandler.prototype._checkAndQuit = function () {
        if (this._callbacks.length === this._callbacksDoneCounter) {
            this._app.quit();
        }
    };
    return AppQuitHandler;
})();

module.exports = AppQuitHandler;
//# sourceMappingURL=AppQuitHandler.js.map
