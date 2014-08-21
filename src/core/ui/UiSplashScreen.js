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
        /**
        * A flag indicates whether the splash screen is open or closed
        *
        * @member {boolean} core.ui.UiSplashScreen~_isOpen
        */
        this._isOpen = false;
        /**
        * A counter that increments on every status update and is used to decide which DOM element should be updated
        *
        * @member {boolean} core.ui.UiSplashScreen~_updateCounter
        */
        this._updateCounter = 0;
        /**
        * A list of pending status items that will be processed by the {@link core.ui.SplashScreen~_statusUpdateTimeout}
        *
        * @member {Array} core.ui.UiSplashScreen~_pendingStatusList
        */
        this._pendingStatusList = [];
        /**
        * Stores the current status update timeout
        *
        * @member {NodeJS.Timer} core.ui.UiSplashScreen~_statusUpdateTimeout
        */
        this._statusUpdateTimeout = null;

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
            _this._window.moveBy(0, 200);
            _this._updateStatus();
            _this.open();
        });
    }
    UiSplashScreen.prototype.close = function () {
        this._window.hide();

        this._isOpen = false;

        if (this._statusUpdateTimeout) {
            global.clearTimeout(this._statusUpdateTimeout);
            this._statusUpdateTimeout = null;
        }

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
        this._pendingStatusList.push(status);

        if (this.isOpen()) {
            this._startUpdateStatusInterval();
        }
    };

    /**
    * Creates the status update interval and updates the initial status
    *
    * @method core.ui.UiSplashScreen~_startUpdateStatusInterval
    */
    UiSplashScreen.prototype._startUpdateStatusInterval = function () {
        var _this = this;
        if (this._statusUpdateTimeout) {
            return;
        }

        this._statusUpdateTimeout = global.setTimeout(function () {
            if (_this._pendingStatusList.length) {
                _this._updateStatus();
                _this._statusUpdateTimeout = null;

                _this._startUpdateStatusInterval();
            }
        }, 3000);

        this._updateStatus();
    };

    /**
    * Updates the status by using an even or odd DOM element to simply cross-fade to the next status in the pending status list
    *
    * @method core.ui.UiSplashScreen~_updateStatus
    */
    UiSplashScreen.prototype._updateStatus = function () {
        this._updateCounter++;

        var isEven = this._updateCounter % 2 === 0 ? true : false;
        var element = isEven ? 'status-even' : 'status-odd';

        this._window.window.document.getElementById('progress-wrapper').className = isEven ? 'even' : 'odd';
        this._window.window.document.getElementById(element).innerHTML = i18n.__('splashScreen.' + this._pendingStatusList.shift());
    };
    return UiSplashScreen;
})(events.EventEmitter);

module.exports = UiSplashScreen;
//# sourceMappingURL=UiSplashScreen.js.map
