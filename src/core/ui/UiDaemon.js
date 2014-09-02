/// <reference path='../../main.d.ts' />
var i18n = require('i18n');

/**
* @class core.ui.UiDaemon
* @implements core.ui.UiDaemonInterface
*/
var UiDaemon = (function () {
    function UiDaemon(gui, appQuitHandler) {
        this._menu = null;
        this._tray = null;
        this._tray = new gui.Tray({
            icon: './images/icon-menubar.png',
            alticon: './images/icon-menubar-active.png'
        });

        this._menu = new gui.Menu();

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
