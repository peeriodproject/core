/// <reference path='../../main.d.ts' />
var i18n = require('i18n');

/**
* @class core.ui.UiDaemon
* @implements core.ui.UiDaemonInterface
*/
var UiDaemon = (function () {
    function UiDaemon(gui, appQuitHandler) {
        var _this = this;
        this._aboutWindow = null;
        this._menu = null;
        this._tray = null;
        this._tray = new gui.Tray({
            icon: './images/icon-menubar@2x.png',
            alticon: './images/icon-menubar-active@2x.png'
        });

        this._menu = new gui.Menu();

        var aboutItem = new gui.MenuItem({
            label: i18n.__('UiDaemon.menu.about.title')
        });

        aboutItem.click = function () {
            if (_this._aboutWindow) {
                _this._aboutWindow.show();
                _this._aboutWindow.focus();

                return;
            }

            _this._aboutWindow = gui.Window.open('./public/about.html', {
                position: 'center',
                show: false,
                focus: true,
                toolbar: false,
                frame: true,
                resizable: false,
                width: 400,
                height: 470,
                fullscreen: false,
                show_in_taskbar: false
            });

            _this._aboutWindow.setAlwaysOnTop(true);

            _this._aboutWindow.once('loaded', function () {
                _this._aboutWindow.show();
                _this._aboutWindow.focus();
            });

            _this._aboutWindow.once('close', function () {
                _this._aboutWindow = null;
            });
        };

        this._menu.append(aboutItem);

        this._menu.append(new gui.MenuItem({
            type: 'separator'
        }));

        var quitItem = new gui.MenuItem({
            label: i18n.__('UiDaemon.menu.quit.title')
        });

        quitItem.click = function () {
            appQuitHandler.quit();
        };

        this._menu.append(quitItem);

        this._tray.menu = this._menu;
    }
    UiDaemon.prototype.getTray = function () {
        return this._tray;
    };
    return UiDaemon;
})();

module.exports = UiDaemon;
//# sourceMappingURL=UiDaemon.js.map
