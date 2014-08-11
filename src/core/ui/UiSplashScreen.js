/// <reference path='../../main.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var i18n = require('i18n');

/**
* @class core.ui.UiSplashScreen
* @implements core.ui.UiSplashScreenInterface
*/
var UiSplashScreen = (function (_super) {
    __extends(UiSplashScreen, _super);
    function UiSplashScreen(gui) {
        var _this = this;
        _super.call(this);
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
            _this._window.moveBy(0, 200);
            _this._updateStatus();
            _this.open();
        });
    }
    UiSplashScreen.prototype.close = function () {
        //this._window.close(true);
        this._window.hide();

        this._isOpen = false;

        this.emit('close');
    };

    UiSplashScreen.prototype.isOpen = function () {
        return this._isOpen;
    };

    UiSplashScreen.prototype.open = function () {
        this._window.show();
        this._window.focus();

        this._isOpen = true;

        this.emit('open');
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
})(events.EventEmitter);

module.exports = UiSplashScreen;
//# sourceMappingURL=UiSplashScreen.js.map
