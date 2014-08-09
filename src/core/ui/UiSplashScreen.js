/// <reference path='../../main.d.ts' />
var i18n = require('i18n');

/**
* @class core.ui.UiSplashScreen
* @implements core.ui.UiSplashScreenInterface
*/
var UiSplashScreen = (function () {
    function UiSplashScreen(gui) {
        var _this = this;
        // todo ts-declaration gui.Window
        this._window = null;
        this._isOpen = false;
        this._currentStatus = '';
        this._window = gui.Window.open('./public/splash-screen.html', {
            position: 'center',
            width: 720,
            height: 400,
            frame: false,
            toolbar: false,
            resizable: false,
            show: false
        });

        this._window.once('loaded', function () {
            _this._window.showDevTools();
            _this._updateStatus();
            _this.open();
        });
    }
    UiSplashScreen.prototype.close = function () {
        this._window.close(true);
    };

    UiSplashScreen.prototype.isOpen = function () {
        return this._isOpen;
    };

    UiSplashScreen.prototype.open = function () {
        this._window.show();
        this._window.focus();

        this._isOpen = true;
    };

    UiSplashScreen.prototype.setStatus = function (status) {
        this._currentStatus = status;

        if (this.isOpen()) {
            this._updateStatus();
        }
    };

    UiSplashScreen.prototype._updateStatus = function () {
        this._window.window.document.getElementById('status').innerHTML = i18n.__('splashScreen.' + this._currentStatus);
    };
    return UiSplashScreen;
})();

module.exports = UiSplashScreen;
//# sourceMappingURL=UiSplashScreen.js.map
